import mongoose from 'mongoose';

const questionEvaluationSchema = new mongoose.Schema({
  id: { type: String },
  question: { type: String, required: true },
  userAnswer: { type: String, default: '' },
  expectedAnswer: { type: String, default: '' },
  right: { type: String, default: null },
  wrong: { type: String, default: null },
  missing: { type: String, default: null },
  grammar: { type: String, default: null },
  score: { type: Number, default: 0 },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const aiExamSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  userInfo: {
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    phone: { type: String, default: '' },
    school: { type: String, default: '' }
  },
  chapterId: {
    type: String,
    required: true,
    index: true
  },
  chapterTitle: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: 'Science'
  },
  weekStart: {
    type: Date,
    required: true,
    index: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  questions: [questionEvaluationSchema],
  finalScore: {
    type: Number,
    default: 0
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  aiCreditsUsed: {
    type: Number,
    default: 1
  },
  promptTokens: {
    type: Number,
    default: 0
  },
  completionTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'partial', 'failed'],
    default: 'completed'
  }
}, {
  timestamps: true
});

aiExamSessionSchema.index({ userId: 1, chapterId: 1, weekStart: 1 });
aiExamSessionSchema.index({ userId: 1, weekStart: 1 });
aiExamSessionSchema.index({ createdAt: -1 });

export default mongoose.model('AiExamSession', aiExamSessionSchema);
