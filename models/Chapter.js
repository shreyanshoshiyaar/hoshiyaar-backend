import mongoose from 'mongoose';

const { Schema } = mongoose;

const ChapterSchema = new Schema({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  isPublished: { type: Boolean, default: false },
  freeLessonsCount: { type: Number, default: null }, // Dynamic free levels in this chapter (null inherits system default)
  lessonPrice: { type: Number, default: null }, // Dynamic price in ₹ for lessons in this chapter (null inherits system default)
  chapterPrice: { type: Number, default: null }, // Dynamic price in ₹ for 1-year chapter unlock (null inherits system default ₹50)
}, { timestamps: true });

ChapterSchema.index({ subjectId: 1, title: 1 }, { unique: true });

export default mongoose.model('Chapter', ChapterSchema);


