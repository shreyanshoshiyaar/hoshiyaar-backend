import mongoose from 'mongoose';

const OtpRateLimitSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Document automatically deletes after 24 hours
  },
});

const OtpRateLimit = mongoose.model('OtpRateLimit', OtpRateLimitSchema);

export default OtpRateLimit;
