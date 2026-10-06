const express = require('express');
const router = express.Router();
const { registerStudent, loginStudent, getDashboard } = require('../controllers/studentController');
const { registrationValidationRules, loginValidationRules, validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// POST /api/students/register
router.post('/register', registrationValidationRules, validate, registerStudent);

// POST /api/students/login
router.post('/login', loginValidationRules, validate, loginStudent);

// GET /api/students/dashboard (protected)
router.get('/dashboard', authenticate, getDashboard);

module.exports = router;

