const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email must not exceed 255 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Remove password from JSON output
studentSchema.methods.toJSON = function () {
  const student = this.toObject();
  delete student.password;
  return student;
};

// Compare password method for future login use
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
