import mongoose from 'mongoose';

const { Schema } = mongoose;

const ChapterSchema = new Schema({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

ChapterSchema.index({ subjectId: 1, title: 1 }, { unique: true });

export default mongoose.model('Chapter', ChapterSchema);


