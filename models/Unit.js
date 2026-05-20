import mongoose from 'mongoose';

const { Schema } = mongoose;

const UnitSchema = new Schema({
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  headerBgUrl: { type: String, default: "" },
  timelineBgUrl: { type: String, default: "" },
}, { timestamps: true });

UnitSchema.index({ chapterId: 1, title: 1 }, { unique: true });

export default mongoose.model('Unit', UnitSchema);


