const Syllabus = require('../models/Syllabus');

const uploadSyllabus = async (req, res) => {
  try {
    const { subject } = req.body;

    // Check whether subject was provided
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    // Check whether a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Syllabus file is required',
      });
    }

    const syllabus = await Syllabus.create({
      subject: subject.trim(),
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: 'Syllabus uploaded successfully',
      syllabus,
    });
  } catch (error) {
    console.error('Syllabus upload error:', error);

    return res.status(500).json({
      success: false,
      message: 'Syllabus could not be processed',
    });
  }
};

module.exports = {
  uploadSyllabus,
};