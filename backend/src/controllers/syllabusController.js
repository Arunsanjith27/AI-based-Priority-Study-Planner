const fs = require('fs/promises');
const Syllabus = require('../models/Syllabus');
const { extractSyllabusText } = require('../services/syllabusExtractor');
const { extractSyllabusTopics } = require('../services/syllabusTopicExtractor');

const uploadSyllabus = async (req, res) => {
  let uploadedFilePath;

  try {
    const { subject } = req.body;
    uploadedFilePath = req.file?.path;

    if (!subject || !subject.trim()) {
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

    const topics = extractSyllabusTopics(extractedText, subject.trim());
    const syllabus = await Syllabus.create({
      subject: subject.trim(),
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      extractedText: extractedText.trim(),
      topics,
    });

    return res.status(201).json({
      success: true,
      message: topics.length
        ? 'Syllabus uploaded and topics extracted successfully'
        : 'Syllabus uploaded and text extracted successfully',
      syllabus,
      data: { topics },
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

const getSyllabusTopics = async (req, res) => {
  try {
    const syllabi = await Syllabus.find({
      $or: [{ topics: { $exists: true, $ne: [] } }, { extractedText: { $ne: '' } }],
    }).sort({ createdAt: -1 }).limit(10);

    const data = syllabi.map((syllabus) => {
      const topics = syllabus.topics?.length
        ? syllabus.topics
        : extractSyllabusTopics(syllabus.extractedText, syllabus.subject);
      return {
        id: syllabus._id,
        subject: syllabus.subject,
        originalFileName: syllabus.originalFileName,
        topics,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Syllabus topic retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Syllabus topics could not be retrieved',
    });
  }
};

module.exports = {
  uploadSyllabus,
  getSyllabusTopics,
};
