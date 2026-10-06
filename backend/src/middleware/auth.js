const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

/**
 * Authentication middleware — verifies JWT token
 * and attaches the student document to req.student.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const student = await Student.findById(decoded.id).select('-password');

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Student account not found.',
      });
    }

    req.student = student;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid or expired token.',
      });
    }

    console.error('Authentication error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during authentication.',
    });
  }
};

module.exports = { authenticate };
