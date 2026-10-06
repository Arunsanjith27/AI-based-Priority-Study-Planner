const Semester = require('../models/Semester');

/**
 * @desc    Create a new semester for the authenticated student
 * @route   POST /api/semesters
 * @access  Private (requires authentication)
 */
const createSemester = async (req, res) => {
  try {
    const { name, subjects } = req.body;

    const semester = await Semester.create({
      student: req.student._id,
      name,
      subjects,
    });

    res.status(201).json({
      success: true,
      message: 'Semester created successfully.',
      data: { semester },
    });
  } catch (error) {
    // Mongoose validation errors (schema-level)
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

    console.error('Create semester error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while creating the semester. Please try again.',
    });
  }
};

/**
 * @desc    Get all semesters for the authenticated student
 * @route   GET /api/semesters
 * @access  Private (requires authentication)
 */
const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find({ student: req.student._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: 'Semesters retrieved successfully.',
      data: { semesters },
    });
  } catch (error) {
    console.error('Get semesters error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while retrieving semesters. Please try again.',
    });
  }
};

/**
 * @desc    Get a single semester by ID for the authenticated student
 * @route   GET /api/semesters/:id
 * @access  Private (requires authentication)
 */
const getSemesterById = async (req, res) => {
  try {
    const semester = await Semester.findOne({
      _id: req.params.id,
      student: req.student._id,
    });

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Semester retrieved successfully.',
      data: { semester },
    });
  } catch (error) {
    // Invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Semester not found.',
      });
    }

    console.error('Get semester by ID error:', error.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while retrieving the semester. Please try again.',
    });
  }
};

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
};
