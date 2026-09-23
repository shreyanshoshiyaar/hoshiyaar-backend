import mongoose from 'mongoose';

const PaymentConfigSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'default', unique: true },
  paywallEnabled: { type: Boolean, default: false }, // Master paywall toggle
  subscriptionMode: { 
    type: String, 
    enum: ['disabled', 'admin_only', 'live'], 
    default: 'admin_only' 
  }, // 'admin_only' keeps subscription & paywall strictly restricted to admins while students have 100% free open access
  freeTrialDays: { type: Number, default: 30 }, // Days of usage before paywall activates
  freeModulesAllowance: { type: Number, default: 0 }, // Number of free modules before paywall
  defaultPricingModel: { 
    type: String, 
    enum: ['ab_test', 'monthly_only', 'pay_per_lesson_only', 'hybrid'], 
    default: 'hybrid' 
  },
  abTesting: {
    enabled: { type: Boolean, default: true },
    variants: {
      control_free: { 
        percentage: { type: Number, default: 10 }, 
        label: { type: String, default: '100% Free (Control Group)' } 
      },
      monthly_only: { 
        percentage: { type: Number, default: 30 }, 
        label: { type: String, default: 'Monthly Subscription Pass' } 
      },
      pay_per_lesson_only: { 
        percentage: { type: Number, default: 30 }, 
        label: { type: String, default: 'Pay Per Lesson Only' } 
      },
      hybrid: { 
        percentage: { type: Number, default: 30 }, 
        label: { type: String, default: 'Hybrid (Monthly or Per-Lesson)' } 
      }
    }
  },
  segmentRules: [{
    segmentType: { type: String, enum: ['classLevel', 'school', 'board'], default: 'classLevel' },
    segmentValue: { type: String, required: true },
    action: { type: String, enum: ['free', 'custom_discount', 'force_plan'], default: 'free' },
    discountPercent: { type: Number, default: 0 },
    customPlanCode: { type: String, default: '' },
    description: { type: String, default: '' }
  }],
  whitelistedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  whitelistedPhones: [{ type: String }],
  razorpay: {
    keyId: { type: String, default: '' },
    keySecret: { type: String, default: '' },
    mockMode: { type: Boolean, default: true } // Sandbox mock testing toggle
  }
}, { timestamps: true });

export default mongoose.model('PaymentConfig', PaymentConfigSchema);
