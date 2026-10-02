import mongoose from 'mongoose';

const PaymentConfigSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'default', unique: true },
  paywallEnabled: { type: Boolean, default: false }, // Master paywall toggle
  subscriptionMode: { 
    type: String, 
    enum: ['disabled', 'admin_only', 'live'], 
    default: 'admin_only' 
  }, // 'admin_only' keeps subscription & paywall strictly restricted to admins while students have 100% free open access
  freeAccessForActiveHomework: { type: Boolean, default: true }, // Free chapter access for enrolled students with active homework assignments
  freeTrialDays: { type: Number, default: 30 }, // Days of usage before paywall activates
  freeModulesAllowance: { type: Number, default: 0 }, // Number of free modules before paywall
  defaultLessonPrice: { type: Number, default: 50 }, // Default price in Rupees per lesson for Pay As You Go
  defaultChapterPrice: { type: Number, default: 50 }, // Default price in Rupees per chapter for 1-Year Pass
  defaultFreeLessonsCount: { type: Number, default: 1 }, // Default number of free levels/lessons per chapter
  defaultPricingModel: { 
    type: String, 
    enum: ['ab_test', 'monthly_only', 'pay_per_lesson_only', 'pay_per_chapter_only', 'hybrid'], 
    default: 'pay_per_chapter_only' 
  },
  abTesting: {
    enabled: { type: Boolean, default: false }, // When enabled, tests between Paid (default) and Free users
    freePercentage: { type: Number, default: 0 }, // 0% by default, all users are paid unless enabled or set
    freeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Specific users granted free access in test
    freePhones: [{ type: String }], // Specific phone numbers granted free access in test
    variants: { type: mongoose.Schema.Types.Mixed, default: {} } // Kept for schema compatibility
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
