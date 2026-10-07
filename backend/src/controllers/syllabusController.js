const fs = require('fs/promises');
const Syllabus = require('../models/Syllabus');
const { extractSyllabusText } = require('../services/syllabusExtractor');

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

    const syllabus = await Syllabus.create({
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

module.exports = {
  uploadSyllabus,
};
