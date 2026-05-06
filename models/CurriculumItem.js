import mongoose from 'mongoose';

const { Schema } = mongoose;

const CurriculumItemSchema = new Schema({
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  order: { type: Number, default: 1 },
  type: { type: String, required: true },
  text: String,
  question: String,
  options: [String],
  answer: String,
  words: [String],
  imageUrl: { type: String },
  imagePublicId: { type: String },
  images: { type: [String], default: [] },
  imagePublicIds: { type: [String], default: [] },
}, { timestamps: true });

CurriculumItemSchema.index({ moduleId: 1, order: 1 });

export default mongoose.model('CurriculumItem', CurriculumItemSchema);


