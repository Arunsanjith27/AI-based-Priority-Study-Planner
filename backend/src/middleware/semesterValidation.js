const { body, validationResult } = require('express-validator');

/**
 * Validation rules for POST /api/semesters
 *
 * Expected body shape:
 * {
 *   name: string,
 *   subjects: [
 *     {
 *       name: string,
 *       code: string (optional),
 *       credits: number,
 *       topics: [{ name: string }]
 *     }
 *   ]
 * }
 */
const createSemesterValidationRules = [
  // Semester name
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Semester name is required')
    .isLength({ max: 100 })
    .withMessage('Semester name must not exceed 100 characters'),

  // Subjects array must exist and have at least one entry
  body('subjects')
    .isArray({ min: 1 })
    .withMessage('A semester must contain at least one subject'),

  // Each subject — name
  body('subjects.*.name')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required')
    .isLength({ max: 200 })
    .withMessage('Subject name must not exceed 200 characters'),

  // Each subject — code (optional, but if present must be ≤ 20 chars)
  body('subjects.*.code')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Subject code must not exceed 20 characters'),

  // Each subject — credits (required positive number)
  body('subjects.*.credits')
    .notEmpty()
    .withMessage('Credits are required for each subject')
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Credits must be a number between 0.5 and 20'),

  // Each subject — topics array must exist and have at least one entry
  body('subjects.*.topics')
    .isArray({ min: 1 })
    .withMessage('Each subject must have at least one topic'),

  // Each topic — name
  body('subjects.*.topics.*.name')
    .trim()
    .notEmpty()
    .withMessage('Topic name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Topic name must not exceed 200 characters'),
];

/**
 * Reuse the same validate middleware pattern as existing validation.js
 */
const validateSemester = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
};

module.exports = {
  createSemesterValidationRules,
  validateSemester,
};
