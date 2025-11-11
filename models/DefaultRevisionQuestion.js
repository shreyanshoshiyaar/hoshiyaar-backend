import mongoose from 'mongoose';

const { Schema } = mongoose;

const DefaultRevisionQuestionSchema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
  classId: { type: Schema.Types.ObjectId, ref: 'ClassLevel' },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
  unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
  // Position of the concept within its lesson for deterministic review flow
  lessonIndex: { type: Number },
  // Question payload
  type: { type: String, enum: ['multiple-choice','fill-in-the-blank','rearrange','statement'], required: true },
  question: { type: String },
  text: { type: String },
  options: { type: [String], default: [] },
  answer: { type: Schema.Types.Mixed },
  words: { type: [String], default: [] },
  images: { type: [String], default: [] },
  order: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

DefaultRevisionQuestionSchema.index({ subjectId: 1, chapterId: 1, unitId: 1, moduleId: 1, order: 1 });

export default mongoose.model('DefaultRevisionQuestion', DefaultRevisionQuestionSchema);


