const express = require('express');
const router = express.Router();
const {
  createSemester,
  getSemesters,
  getSemesterById,
  addSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/semesterController');
const {
  createSemesterValidationRules,
  validateSemester,
} = require('../middleware/semesterValidation');
const { authenticate } = require('../middleware/auth');

// All semester routes require authentication
router.use(authenticate);

// POST /api/semesters              — create a new semester
router.post('/', createSemesterValidationRules, validateSemester, createSemester);

// GET  /api/semesters              — get all semesters for the authenticated student
router.get('/', getSemesters);

// GET  /api/semesters/:id          — get a single semester by ID
router.get('/:id', getSemesterById);

// POST   /api/semesters/:id/subjects               — add a subject to a semester
router.post('/:id/subjects', addSubject);

// PUT    /api/semesters/:id/subjects/:subjectId    — update a subject
router.put('/:id/subjects/:subjectId', updateSubject);

// DELETE /api/semesters/:id/subjects/:subjectId    — delete a subject
router.delete('/:id/subjects/:subjectId', deleteSubject);

module.exports = router;
