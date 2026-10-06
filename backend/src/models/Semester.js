const mongoose = require('mongoose');

// ─── Topic sub-schema ─────────────────────────────────────────────────────────
const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      minlength: [1, 'Topic name cannot be empty'],
      maxlength: [200, 'Topic name must not exceed 200 characters'],
    },
  },
  { _id: true }
);

// ─── Subject sub-schema ───────────────────────────────────────────────────────
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      minlength: [1, 'Subject name cannot be empty'],
      maxlength: [200, 'Subject name must not exceed 200 characters'],
    },
    code: {
      type: String,
      trim: true,
      maxlength: [20, 'Subject code must not exceed 20 characters'],
      default: '',
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [0.5, 'Credits must be at least 0.5'],
      max: [20, 'Credits must not exceed 20'],
    },
    topics: {
      type: [topicSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'Each subject must have at least one topic',
      },
    },
  },
  { _id: true }
);

// ─── Semester schema ──────────────────────────────────────────────────────────
const semesterSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
      minlength: [1, 'Semester name cannot be empty'],
      maxlength: [100, 'Semester name must not exceed 100 characters'],
    },
    subjects: {
      type: [subjectSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'A semester must contain at least one subject',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Semester = mongoose.model('Semester', semesterSchema);

module.exports = Semester;
