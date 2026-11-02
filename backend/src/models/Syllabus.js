const mongoose = require('mongoose');

/**
 * AI analysis result embedded on a syllabus document. Optional and populated
 * only after `POST /api/syllabus/:id/analyze`. All fields are optional so that
 * existing syllabus documents (and the upload flow) are unaffected.
 *
 * Constraints mirror the Semester `subjectSchema` so an analysis can be applied
 * directly to a semester subject without further transformation.
 */
const aiAnalysisTopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

const aiAnalysisSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    code: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    credits: {
      type: Number,
      min: 0.5,
      max: 20,
    },
    topics: {
      type: [aiAnalysisTopicSchema],
      default: [],
    },
    model: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const syllabusSchema = new mongoose.Schema(
  {
    // Owner of this syllabus. Required so uploads and analysis are user-scoped.
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    originalFileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      required: true,
    },

    extractedText: {
      type: String,
      default: '',
    },

    // AI-derived study outline (populated by the analyze route). Optional.
    aiAnalysis: {
      type: aiAnalysisSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Syllabus', syllabusSchema);