import mongoose from 'mongoose';

const PaymentTransactionSchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },
  paymentId: { type: String, default: '', index: true },
  signature: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true }, // In Rupees (e.g. 299)
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['created', 'captured', 'failed', 'refunded'], 
    default: 'created', 
    index: true 
  },
  paymentType: { 
    type: String, 
    enum: ['subscription', 'pay_per_lesson'], 
    required: true 
  },
  planCode: { type: String, default: '' },
  itemDetails: {
    moduleId: { type: String },
    moduleTitle: { type: String },
    chapterTitle: { type: String },
    moduleIds: [{ type: String }],
    moduleTitles: [{ type: String }],
    count: { type: Number },
    unitPrice: { type: Number }
  },
  userSnapshot: {
    username: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    school: { type: String },
    classLevel: { type: String }
  },
  experimentVariant: { type: String, default: '' },
  rawGatewayResponse: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('PaymentTransaction', PaymentTransactionSchema);
