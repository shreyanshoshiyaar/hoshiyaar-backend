import mongoose from 'mongoose';
const { Schema } = mongoose;

const lessonItemSchema = new Schema({
  module: {
    type: Number,
    required: true,
  },
//   slide: {
//     type: Number,
//     required: true,
//   },
  type: {
    type: String,
    enum: ['concept', 'statement', 'fill-in-the-blank', 'multiple-choice', 'rearrange', 'comic'],
    required: true,
  },
  title: String,
  content: String,
  text: String,
  question: String,
  answer: { type: Schema.Types.Mixed, default: null },
  options: [String],
  words: [String],
  order: { type: Number, default: 0 },
});

lessonItemSchema.index({ module: 1 });

const LessonItem = mongoose.model('LessonItem', lessonItemSchema);

export default LessonItem;