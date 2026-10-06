const Student = require('../models/Student');

/**
 * @desc    Register a new student
 * @route   POST /api/students/register
 * @access  Public
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if a student with this email already exists
    const existingStudent = await Student.findOne({ email: email.toLowerCase().trim() });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        errors: [{ field: 'email', message: 'An account with this email already exists' }],
      });
    }

    // Create the student (password is hashed automatically by the pre-save hook)
    const student = await Student.create({ name, email, password });

    // Return the created student (password is stripped by toJSON)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account has been created.',
      data: {
        student: student.toJSON(),
      },
    });
  } catch (error) {
    // Handle Mongoose duplicate key error (race condition safety)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        errors: [{ field: 'email', message: 'An account with this email already exists' }],
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const formattedErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during registration. Please try again.',
    });
  }
};

module.exports = {
  registerStudent,
};
