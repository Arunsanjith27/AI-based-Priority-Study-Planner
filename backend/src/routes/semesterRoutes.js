const express = require('express');
const router = express.Router();
const {
  createSemester,
  getSemesters,
  getSemesterById,
} = require('../controllers/semesterController');
const {
  createSemesterValidationRules,
  validateSemester,
} = require('../middleware/semesterValidation');
const { authenticate } = require('../middleware/auth');

// All semester routes require authentication
router.use(authenticate);

// POST /api/semesters        — create a new semester
router.post('/', createSemesterValidationRules, validateSemester, createSemester);

// GET  /api/semesters        — get all semesters for the authenticated student
router.get('/', getSemesters);

// GET  /api/semesters/:id    — get a single semester by ID
router.get('/:id', getSemesterById);

module.exports = router;
