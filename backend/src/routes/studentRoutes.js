const express = require('express');
const router = express.Router();
const { registerStudent } = require('../controllers/studentController');
const { registrationValidationRules, validate } = require('../middleware/validation');

// POST /api/students/register
router.post('/register', registrationValidationRules, validate, registerStudent);

module.exports = router;
