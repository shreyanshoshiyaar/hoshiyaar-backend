import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: false, // Changed from true to support guest
      unique: true,
      trim: true,
      sparse: true // Ensure unique check ignores nulls
    },
    name: {
      type: String,
    },
    // Email is optional now; login is done via username
    email: {
      type: String,
      default: null,
      unique: false,
      sparse: true, // Only index non-null values
      trim: true,
    },
    age: {
      type: Number,
      required: false, // Changed from true
      default: null
    },
    dateOfBirth: {
      type: Date,
      required: false, // Changed from true
      default: null
    },
    classLevel: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Not all existing users will have this initially
    },
    // Onboarding selections
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassLevel', default: null },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
  // Deprecated name-based fields kept for backward compatibility with older clients
    board: {
      type: String,
      default: null,
      trim: true,
    },
    subject: {
      type: String,
      default: null,
      trim: true,
    },
    chapter: {
      type: String,
      default: null,
      trim: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    school: {
      type: String,
      default: null,
      trim: true,
    },
    chaptersProgress: {
      type: [
        new mongoose.Schema(
          {
            chapter: { type: Number, required: true },
            subject: { type: String, required: true }, // Add subject field
            conceptCompleted: { type: Boolean, default: false },
            quizCompleted: { type: Boolean, default: false },
            // Per-lesson stats keyed by lesson title
            stats: {
              type: Map,
              of: new mongoose.Schema(
                {
                  correct: { type: Number, default: 0 },
                  wrong: { type: Number, default: 0 },
                  bestScore: { type: Number, default: 0 },
                  lastScore: { type: Number, default: 0 },
                  lastReviewedAt: { type: Date, default: null },
                },
                { _id: false }
              ),
              default: {},
            },
            // Track completed modules for this chapter/subject combination
            completedModules: {
              type: [String],
              default: [],
            },
            updatedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    platform: {
      type: String,
      enum: ['web', 'android', 'ios', 'unknown'],
      default: 'unknown'
    },
    fcmToken: {
      type: String,
      default: null
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Metadata for anonymous users
userSchema.add({
  isGuest: { type: Boolean, default: false },
});

// Add points fields after schema definition for clarity
userSchema.add({
  totalPoints: { type: Number, default: 0 },
  // Ledger keyed by questionId to enforce idempotent scoring
  pointsLedger: {
    type: Map,
    of: new mongoose.Schema(
      {
        awarded: { type: Number, default: 0 }, // net points awarded for this questionId
        correct: { type: Boolean, default: false },
        type: { type: String, enum: ['curriculum', 'revision'], default: 'curriculum' },
        moduleId: { type: String, default: null },
        attemptedAt: { type: Date, default: Date.now },
      },
      { _id: false }
    ),
    default: new Map(),
  },
});

// Method to compare entered date of birth with the stored date of birth
userSchema.methods.matchDateOfBirth = async function (enteredDateOfBirth) {
  if (!this.dateOfBirth || !enteredDateOfBirth) return false;
  // Convert both dates to ISO string format for comparison
  const storedDate = this.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD format
  const enteredDate = new Date(enteredDateOfBirth).toISOString().split('T')[0];
  return storedDate === enteredDate;
};

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

const User = mongoose.model('User', userSchema);

export default User;

