import mongoose from 'mongoose';

const { Schema } = mongoose;

const ClassroomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      default: 'Science',
    },
    classLevel: {
      type: String,
      required: true,
      trim: true,
    },
    school: {
      type: String,
      trim: true,
      default: '',
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for looking up teacher's classrooms
ClassroomSchema.index({ teacherId: 1, isActive: 1 });

export default mongoose.model('Classroom', ClassroomSchema);
