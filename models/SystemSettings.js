import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('SystemSettings', SystemSettingsSchema);
