const fs = require('fs/promises');
const Syllabus = require('../models/Syllabus');
const { extractSyllabusText } = require('../services/syllabusExtractor');
const { analyzeSyllabus, SyllabusAnalysisError } = require('../services/syllabusAnalyzer');

/** Map analyzer error codes → HTTP statuses. */
const ANALYSIS_ERROR_STATUS = {
  OLLAMA_UNREACHABLE: 503,
  OLLAMA_NOT_FOUND:   503,
  OLLAMA_UNKNOWN:     503,
  TIMEOUT:            504,
  OLLAMA_HTTP_ERROR:  502,
  OLLAMA_BAD_JSON:    502,
  OLLAMA_EMPTY:       502,
  NO_TEXT:            422,
  NO_TOPICS:          422,
  NO_SUBJECT:         422,
  INVALID_OUTPUT:     422,
};

// ── helpers ───────────────────────────────────────────────────────────────────

function isCastError(err) {
  return err.name === 'CastError';
}

// ── handlers ──────────────────────────────────────────────────────────────────

/**
 * @desc  Upload a syllabus file, extract its text, and persist it.
 * @route POST /api/syllabus/upload
 * @access Private
 */
const uploadSyllabus = async (req, res) => {
  let uploadedFilePath;
  try {
    const { subject } = req.body;
    uploadedFilePath  = req.file?.path;

    if (!subject || !subject.trim()) {
      if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Syllabus file is required' });
    }

    const extractedText = await extractSyllabusText(req.file.path, req.file.mimetype);

    if (!extractedText || !extractedText.trim()) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'The syllabus contains no readable text',
      });
    }

    const syllabus = await Syllabus.create({
      student:          req.student._id,
      subject:          subject.trim(),
      originalFileName: req.file.originalname,
      filePath:         req.file.path,
      fileType:         req.file.mimetype,
      extractedText:    extractedText.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Syllabus uploaded and text extracted successfully',
      syllabus,
    });
  } catch (error) {
    console.error('Syllabus processing error:', error);
    if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => {});
    return res.status(500).json({ success: false, message: 'Syllabus could not be processed' });
  }
};

/**
 * @desc  Fetch a single syllabus (with its AI analysis) for the owner.
 * @route GET /api/syllabus/:id
 * @access Private
 */
const getSyllabusById = async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({
      _id:     req.params.id,
      student: req.student._id,
    });

    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Syllabus retrieved successfully.',
      data:    { syllabus },
    });
  } catch (error) {
    if (isCastError(error)) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }
    console.error('Get syllabus error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve syllabus.' });
  }
};

/**
 * @desc  Run AI analysis on a previously-uploaded syllabus and persist the draft.
 * @route POST /api/syllabus/:id/analyze
 * @access Private
 */
const analyzeSyllabusById = async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({
      _id:     req.params.id,
      student: req.student._id,
    });

    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }

    if (!syllabus.extractedText || !syllabus.extractedText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'This syllabus has no extracted text to analyze.',
      });
    }

    const analysis = await analyzeSyllabus(syllabus.extractedText, syllabus.subject);

    syllabus.aiAnalysis = {
      subjectName: analysis.subjectName,
      code:        analysis.code,
      credits:     analysis.credits,
      // Attach included:true by default so every topic is pre-selected in the review UI.
      topics:      analysis.topics.map(t => ({ name: t.name, included: true })),
      model:       analysis.model,
      status:      'completed',
      analyzedAt:  new Date(),
    };
    // Reset review state so re-analysis invalidates a prior decision.
    syllabus.reviewStatus   = 'pending';
    syllabus.reviewFeedback = '';
    syllabus.reviewedAt     = null;
    await syllabus.save();

    return res.status(200).json({
      success: true,
      message: 'Syllabus analyzed successfully.',
      data:    { syllabus, analysis },
    });
  } catch (error) {
    if (error instanceof SyllabusAnalysisError) {
      const status = ANALYSIS_ERROR_STATUS[error.code] || 500;
      return res.status(status).json({ success: false, message: error.message });
    }
    if (isCastError(error)) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }
    console.error('Syllabus analysis error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Syllabus analysis could not be completed.',
    });
  }
};

/**
 * @desc  Submit a review decision (approve / reject) for an AI analysis.
 *        An approval may include:
 *          - updated subjectName / code / credits on the analysis
 *          - per-topic `included` flags (to deselect unwanted topics)
 *        A rejection may include optional feedback text.
 * @route PUT /api/syllabus/:id/review
 * @access Private
 */
const reviewSyllabus = async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({
      _id:     req.params.id,
      student: req.student._id,
    });

    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }

    if (!syllabus.aiAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'This syllabus has not been analyzed yet. Run the analysis first.',
      });
    }

    const { decision, feedback, subjectName, code, credits, topics } = req.body;

    const allowed = ['approved', 'rejected'];
    if (!allowed.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid decision. Allowed values: ${allowed.join(', ')}.`,
      });
    }

    if (decision === 'approved') {
      // Apply any edits the student made in the review UI.
      if (subjectName !== undefined) {
        syllabus.aiAnalysis.subjectName = String(subjectName).trim().slice(0, 200) || syllabus.aiAnalysis.subjectName;
      }
      if (code !== undefined) {
        syllabus.aiAnalysis.code = String(code).trim().slice(0, 20);
      }
      if (credits !== undefined) {
        const c = Number(credits);
        if (Number.isFinite(c) && c >= 0.5 && c <= 20) {
          syllabus.aiAnalysis.credits = Math.round(c * 2) / 2;
        }
      }
      if (Array.isArray(topics)) {
        // topics is an array of { name, included } from the frontend.
        // Merge the included flags back onto the stored topics by name (case-insensitive).
        const reviewMap = new Map(
          topics.map(t => [String(t.name).toLowerCase(), Boolean(t.included)])
        );
        syllabus.aiAnalysis.topics = syllabus.aiAnalysis.topics.map(t => ({
          name:     t.name,
          included: reviewMap.has(t.name.toLowerCase())
            ? reviewMap.get(t.name.toLowerCase())
            : t.included,
        }));
      }
    }

    syllabus.reviewStatus   = decision;
    syllabus.reviewFeedback = feedback ? String(feedback).trim().slice(0, 1000) : '';
    syllabus.reviewedAt     = new Date();

    // Mark subdocument as modified so Mongoose persists it.
    syllabus.markModified('aiAnalysis');
    await syllabus.save();

    return res.status(200).json({
      success: true,
      message: `Syllabus analysis ${decision}.`,
      data:    { syllabus },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    if (isCastError(error)) {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }
    console.error('Review syllabus error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not save review decision.' });
  }
};

module.exports = { uploadSyllabus, getSyllabusById, analyzeSyllabusById, reviewSyllabus };
