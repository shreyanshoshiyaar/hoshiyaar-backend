import mongoose from 'mongoose';

const UserSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  status: { 
    type: String, 
    enum: ['free_trial', 'active_subscription', 'expired', 'canceled', 'exempt'], 
    default: 'free_trial' 
  },
  activePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  purchasedModules: [{
    moduleId: { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now },
    amountPaid: { type: Number, default: 0 }, // In Rupees
    orderId: { type: String }
  }],
  assignedVariant: { type: String, default: '' }, // A/B test bucket: control_free, monthly_only, pay_per_lesson_only, hybrid
  firstActiveDate: { type: Date, default: Date.now }, // Date for 30-day usage calculation
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: { type: Date },
  cancellationReason: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('UserSubscription', UserSubscriptionSchema);
