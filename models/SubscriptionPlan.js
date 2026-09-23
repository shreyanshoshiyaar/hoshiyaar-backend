import mongoose from 'mongoose';

const SubscriptionPlanSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['subscription', 'pay_per_lesson', 'custom'], 
    default: 'subscription' 
  },
  billingCycle: { 
    type: String, 
    enum: ['monthly', 'annual', 'one_time', 'per_lesson'], 
    default: 'monthly' 
  },
  amount: { type: Number, required: true }, // In Rupees (e.g. 299)
  discountedFrom: { type: Number, default: 0 }, // In Rupees (e.g. 499)
  currency: { type: String, default: 'INR' },
  features: [{ type: String }],
  badge: { type: String, default: '' }, // e.g. 'Most Popular'
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
