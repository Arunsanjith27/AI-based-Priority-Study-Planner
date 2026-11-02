const mongoose = require('mongoose');

// ── ai analysis topic sub-schema ──────────────────────────────────────────────
const aiTopicSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 200,
    },
    // Per-topic review decision: kept null until the student explicitly reviews
    included: {
      type:    Boolean,
      default: true,
    },
  },
  { _id: false }
);

// ── ai analysis result sub-schema ────────────────────────────────────────────
const aiAnalysisSchema = new mongoose.Schema(
  {
    subjectName: { type: String, trim: true, maxlength: 200 },
    code:        { type: String, trim: true, maxlength: 20, default: '' },
    credits:     { type: Number, min: 0.5, max: 20 },
    topics:      { type: [aiTopicSchema], default: [] },
    model:       { type: String, default: '' },
    status: {
      type:    String,
      enum:    ['completed', 'failed'],
      default: 'completed',
    },
    analyzedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── main schema ───────────────────────────────────────────────────────────────
const syllabusSchema = new mongoose.Schema(
  {
    // Owner — required so every syllabus is user-scoped.
    student: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Student',
      required: true,
      index:    true,
    },

    subject: {
      type:     String,
      required: true,
      trim:     true,
    },

    originalFileName: {
      type:     String,
      required: true,
    },

    filePath: {
      type:     String,
      required: true,
    },

    fileType: {
      type:     String,
      required: true,
    },

    extractedText: {
      type:    String,
      default: '',
    },

    // Populated after POST /api/syllabus/:id/analyze
    aiAnalysis: {
      type:    aiAnalysisSchema,
      default: null,
    },

    // Review lifecycle:
    //   pending   → analysis done, student hasn't reviewed yet
    //   approved  → student accepted (possibly with edited topics)
    //   rejected  → student rejected the analysis
    reviewStatus: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    reviewFeedback: {
      type:    String,
      trim:    true,
      default: '',
    },

    reviewedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Syllabus', syllabusSchema);
