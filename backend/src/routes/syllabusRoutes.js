const express = require('express');
const multer = require('multer');
const path = require('path');

const { uploadSyllabus } = require('../controllers/syllabusController');

const router = express.Router();

// Configure where uploaded files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Supported file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF and TXT files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// POST /api/syllabus/upload
router.post('/upload', upload.single('syllabus'), uploadSyllabus);

module.exports = router;