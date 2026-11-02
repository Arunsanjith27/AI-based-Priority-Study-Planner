const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadSyllabus, analyzeSyllabusById } = require('../controllers/syllabusController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure where uploaded files are stored
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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

// All syllabus routes require authentication. Uploads and analysis are scoped
// to the authenticated student (req.student), set by the authenticate middleware.
router.use(authenticate);

// POST /api/syllabus/upload
router.post('/upload', upload.single('syllabus'), uploadSyllabus);

// POST /api/syllabus/:id/analyze
// Analyzes a previously-uploaded syllabus with the local AI model (Ollama).
// Ownership is enforced in the handler (findOne by student).
router.post('/:id/analyze', analyzeSyllabusById);

module.exports = router;