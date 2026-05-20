import mongoose from 'mongoose';

const { Schema } = mongoose;

const UnitSchema = new Schema({
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  // Mobile backgrounds
  headerBgUrl: { type: String, default: "" },
  timelineBgUrl: { type: String, default: "" },
  // Desktop backgrounds (optional - falls back to mobile if not set)
  desktopHeaderBgUrl: { type: String, default: "" },
  desktopTimelineBgUrl: { type: String, default: "" },
}, { timestamps: true });

UnitSchema.index({ chapterId: 1, title: 1 }, { unique: true });

export default mongoose.model('Unit', UnitSchema);


