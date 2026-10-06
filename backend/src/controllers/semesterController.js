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

/**
 * @desc    Add a new subject to an existing semester
 * @route   POST /api/semesters/:id/subjects
 * @access  Private (requires authentication)
 */
const addSubject = async (req, res) => {
  try {
    const semester = await Semester.findOne({
      _id: req.params.id,
      student: req.student._id,
    });

    if (!semester) {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }

    const { name, code, credits, topics } = req.body;

    semester.subjects.push({ name, code: code || '', credits, topics: topics || [] });
    await semester.save();

    const newSubject = semester.subjects[semester.subjects.length - 1];

    res.status(201).json({
      success: true,
      message: 'Subject added successfully.',
      data: { subject: newSubject, semester },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const formattedErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }
    console.error('Add subject error:', error.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
  }
};

/**
 * @desc    Update an existing subject (name, code, credits, topics) within a semester
 * @route   PUT /api/semesters/:id/subjects/:subjectId
 * @access  Private (requires authentication)
 */
const updateSubject = async (req, res) => {
  try {
    const semester = await Semester.findOne({
      _id: req.params.id,
      student: req.student._id,
    });

    if (!semester) {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }

    const subject = semester.subjects.id(req.params.subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const { name, code, credits, topics } = req.body;

    if (name !== undefined) subject.name = name;
    if (code !== undefined) subject.code = code;
    if (credits !== undefined) subject.credits = credits;
    if (topics !== undefined) subject.topics = topics;

    await semester.save();

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data: { subject, semester },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const formattedErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }
    console.error('Update subject error:', error.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
  }
};

/**
 * @desc    Delete a subject from a semester
 * @route   DELETE /api/semesters/:id/subjects/:subjectId
 * @access  Private (requires authentication)
 */
const deleteSubject = async (req, res) => {
  try {
    const semester = await Semester.findOne({
      _id: req.params.id,
      student: req.student._id,
    });

    if (!semester) {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }

    const subject = semester.subjects.id(req.params.subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    subject.deleteOne();
    await semester.save();

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully.',
      data: { semester },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }
    console.error('Delete subject error:', error.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
  }
};

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
  addSubject,
  updateSubject,
  deleteSubject,
};
