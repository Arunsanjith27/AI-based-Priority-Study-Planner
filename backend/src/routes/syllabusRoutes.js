const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const {
  uploadSyllabus,
  getSyllabusById,
  analyzeSyllabusById,
  reviewSyllabus,
} = require('../controllers/syllabusController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── multer setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'text/plain'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF and TXT files are allowed.'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ── all syllabus routes require authentication ────────────────────────────────
router.use(authenticate);

// POST /api/syllabus/upload
router.post('/upload', upload.single('syllabus'), uploadSyllabus);

// GET  /api/syllabus/:id        — fetch syllabus + analysis for review page
router.get('/:id', getSyllabusById);

// POST /api/syllabus/:id/analyze — run AI analysis, reset review state
router.post('/:id/analyze', analyzeSyllabusById);

// PUT  /api/syllabus/:id/review  — submit approve/reject decision
router.put('/:id/review', reviewSyllabus);

module.exports = router;
