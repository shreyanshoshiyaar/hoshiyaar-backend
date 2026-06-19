import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Document automatically deletes after 300 seconds (5 minutes)
  },
  attempts: {
    type: Number,
    default: 0
  }
});

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
