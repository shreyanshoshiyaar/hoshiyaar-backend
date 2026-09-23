import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../models/PaymentConfig.js';

class RazorpayService {
  /**
   * Retrieves active payment config and Razorpay credentials
   */
  async getConfig() {
    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await PaymentConfig.create({ singletonKey: 'default' });
    }
    return config;
  }

  /**
   * Returns initialized Razorpay instance if keys are configured
   */
  async getClient() {
    const config = await this.getConfig();
    const envKeyId = process.env.RAZORPAY_KEY_ID?.trim();
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    const keyId = config.razorpay?.keyId || envKeyId;
    const keySecret = config.razorpay?.keySecret || envKeySecret;

    const hasValidKeys = Boolean(keyId && keySecret && keyId !== 'rzp_test_mock_mode');

    // If valid keys exist in .env or config, and mockMode is not strictly forced without env keys
    const mockMode = !hasValidKeys || (config.razorpay?.mockMode === true && !envKeyId);

    if (!mockMode && hasValidKeys) {
      return {
        instance: new Razorpay({ key_id: keyId, key_secret: keySecret }),
        mockMode: false,
        keyId,
        keySecret
      };
    }

    return {
      instance: null,
      mockMode: true,
      keyId: keyId || 'rzp_test_mock_mode',
      keySecret: keySecret || 'mock_secret'
    };
  }

  /**
   * Creates an order with Razorpay or generates a mock order
   * @param {Object} params
   * @param {number} [params.amount] - Amount in paise (e.g. 1900) or standard rupees if amountRupees given
   * @param {number} [params.amountRupees] - Amount in standard Rupees (e.g. 19, 299)
   * @param {string} [params.currency] - Default 'INR'
   * @param {string} [params.receipt] - Internal receipt or order ID
   * @param {Object} [params.notes] - Metadata
   */
  async createOrder({ amount, amountRupees, currency = 'INR', receipt, notes = {} }) {
    const { instance, mockMode, keyId } = await this.getClient();

    let amountInPaise;
    if (amountRupees !== undefined && amountRupees !== null) {
      amountInPaise = Math.round(Number(amountRupees) * 100);
    } else if (amount !== undefined && amount !== null) {
      amountInPaise = Math.round(Number(amount));
    } else {
      const err = new Error('Order amount is required');
      err.statusCode = 400;
      throw err;
    }

    // Minimum amount validation: Razorpay requires >= 100 paise (₹1.00)
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      const err = new Error('Amount must be at least 100 paise (₹1.00)');
      err.statusCode = 400;
      throw err;
    }

    const calculatedRupees = amountInPaise / 100;

    if (!mockMode && instance) {
      try {
        const order = await instance.orders.create({
          amount: amountInPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes
        });

        return {
          order_id: order.id,
          orderId: order.id,
          amount: order.amount, // in paise as per Razorpay standard spec
          amountRupees: calculatedRupees,
          amountInPaise: order.amount,
          currency: order.currency,
          keyId,
          mockMode: false
        };
      } catch (err) {
        console.error('[RazorpayService] Razorpay API order creation failed:', err);
        const apiError = new Error(err.error?.description || err.message || 'Razorpay order creation failed');
        apiError.statusCode = err.statusCode || 500;
        throw apiError;
      }
    }

    // Mock Order generation for testing / development
    const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      order_id: mockOrderId,
      orderId: mockOrderId,
      amount: amountInPaise,
      amountRupees: calculatedRupees,
      amountInPaise,
      currency,
      keyId: keyId || 'rzp_test_mock_mode',
      mockMode: true
    };
  }

  /**
   * Cryptographically verifies Razorpay HMAC SHA256 payment signature
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} params.paymentId
   * @param {string} params.signature
   */
  async verifyPaymentSignature({ orderId, paymentId, signature }) {
    const { mockMode, keySecret } = await this.getClient();

    if (!orderId || !paymentId || !signature) {
      return { isValid: false, reason: 'missing_fields', mockMode };
    }

    // Fallback for mock mode orders
    if (mockMode && (orderId.startsWith('order_mock_') || paymentId.startsWith('pay_mock_'))) {
      return { isValid: true, mockMode: true };
    }

    if (!keySecret) {
      const err = new Error('Razorpay Key Secret is missing. Cannot verify signature.');
      err.statusCode = 500;
      throw err;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    let isValid = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');
      if (expectedBuf.length === signatureBuf.length) {
        isValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);
      }
    } catch {
      isValid = false;
    }

    return { isValid, mockMode: false };
  }
}

export default new RazorpayService();
