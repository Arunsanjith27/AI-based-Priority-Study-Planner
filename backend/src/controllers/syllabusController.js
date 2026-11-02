const fs = require('fs/promises');
const Syllabus = require('../models/Syllabus');
const { extractSyllabusText } = require('../services/syllabusExtractor');
const {
  analyzeSyllabus,
  SyllabusAnalysisError,
} = require('../services/syllabusAnalyzer');

/**
 * Map analyzer error codes to HTTP statuses so the controller doesn't branch
 * on message text.
 */
const ANALYSIS_ERROR_STATUS = {
  OLLAMA_UNREACHABLE: 503,
  OLLAMA_NOT_FOUND: 503,
  OLLAMA_UNKNOWN: 503,
  TIMEOUT: 504,
  OLLAMA_HTTP_ERROR: 502,
  OLLAMA_BAD_JSON: 502,
  OLLAMA_EMPTY: 502,
  NO_TEXT: 422,
  NO_TOPICS: 422,
  NO_SUBJECT: 422,
  INVALID_OUTPUT: 422,
};

const uploadSyllabus = async (req, res) => {
  let uploadedFilePath;

  try {
    const { subject } = req.body;
    uploadedFilePath = req.file?.path;

    if (!subject || !subject.trim()) {
      if (uploadedFilePath) {
        await fs.unlink(uploadedFilePath).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Syllabus file is required',
      });
    }

    const extractedText = await extractSyllabusText(
      req.file.path,
      req.file.mimetype
    );

    if (!extractedText || !extractedText.trim()) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: 'The syllabus contains no readable text',
      });
    }

    const syllabus = await Syllabus.create({
      student: req.student._id,
      subject: subject.trim(),
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      extractedText: extractedText.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Syllabus uploaded and text extracted successfully',
      syllabus,
    });
  } catch (error) {
    console.error('Syllabus processing error:', error);

    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: 'Syllabus could not be processed',
    });
  }
};

/**
 * @desc    Analyze a previously-uploaded syllabus with the local AI model and
 *          persist the structured subject/topics outline.
 * @route   POST /api/syllabus/:id/analyze
 * @access  Private (requires authentication)
 */
const analyzeSyllabusById = async (req, res) => {
  try {
    // Ownership-scoped: a student can only analyze their own syllabus.
    const syllabus = await Syllabus.findOne({
      _id: req.params.id,
      student: req.student._id,
    });

    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus not found.',
      });
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
      code: analysis.code,
      credits: analysis.credits,
      topics: analysis.topics,
      model: analysis.model,
      status: 'completed',
      analyzedAt: new Date(),
    };
    await syllabus.save();

    return res.status(200).json({
      success: true,
      message: 'Syllabus analyzed successfully.',
      data: { syllabus, analysis },
    });
  } catch (error) {
    if (error instanceof SyllabusAnalysisError) {
      const status = ANALYSIS_ERROR_STATUS[error.code] || 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }

    // Invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Syllabus not found.',
      });
    }

    console.error('Syllabus analysis error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Syllabus analysis could not be completed.',
    });
  }
};

module.exports = {
  uploadSyllabus,
  analyzeSyllabusById,
};
