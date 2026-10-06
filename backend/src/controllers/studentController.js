const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

/**
 * Generate a JWT token for a student
 */
const generateToken = (studentId) => {
  return jwt.sign(
    { id: studentId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

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

/**
 * @desc    Login a student
 * @route   POST /api/students/login
 * @access  Public
 */
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student by email — include password field for comparison
    const student = await Student.findOne({ email: email.toLowerCase().trim() });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare submitted password with stored hash using AISP-1's comparePassword method
    const isMatch = await student.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken(student._id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        student: student.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during login. Please try again.',
    });
  }
};

/**
 * @desc    Get student dashboard information
 * @route   GET /api/students/dashboard
 * @access  Private (requires authentication)
 */
const getDashboard = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully.',
      data: {
        student: req.student,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getDashboard,
};

