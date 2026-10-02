import mongoose from 'mongoose';

const { Schema } = mongoose;

const TargetLessonSchema = new Schema(
  {
    moduleId: {
      type: Schema.Types.Mixed,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    classroomId: {
      type: Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    chapterId: {
      type: Schema.Types.Mixed,
    },
    chapterTitle: {
      type: String,
      required: true,
      trim: true,
    },
    targetLessons: {
      type: [TargetLessonSchema],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'An assignment must contain at least one target lesson.',
      },
    },
    isEntireChapter: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
      index: true,
    },
    remindersSent: {
      dueTomorrow: { type: Boolean, default: false },
      dueToday: { type: Boolean, default: false },
      overdue: { type: Boolean, default: false },
      lastManualNudgeAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

AssignmentSchema.index({ classroomId: 1, status: 1, dueDate: 1 });

export default mongoose.model('Assignment', AssignmentSchema);
