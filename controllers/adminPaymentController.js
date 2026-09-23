import PaymentConfig from '../models/PaymentConfig.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import UserSubscription from '../models/UserSubscription.js';
import User from '../models/User.js';
import { seedDefaultPlans } from './paymentController.js';

/**
 * GET /api/admin/payments/settings
 * Full administrative overview: config, plans, and metrics
 */
export const getPaymentSettings = async (req, res) => {
  try {
    await seedDefaultPlans();
    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await PaymentConfig.create({ singletonKey: 'default' });
    }

    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1 });

    // Financial & subscription aggregates
    const [
      totalCapturedTransactions,
      revenueResult,
      activeSubscribersCount,
      totalSinglePurchases
    ] = await Promise.all([
      PaymentTransaction.countDocuments({ status: 'captured' }),
      PaymentTransaction.aggregate([
        { $match: { status: 'captured' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      UserSubscription.countDocuments({ 
        status: 'active_subscription',
        currentPeriodEnd: { $gt: new Date() }
      }),
      PaymentTransaction.countDocuments({ 
        status: 'captured', 
        paymentType: 'pay_per_lesson' 
      })
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      config,
      plans,
      analytics: {
        totalRevenueRupees: totalRevenue,
        capturedTransactionsCount: totalCapturedTransactions,
        activeSubscribersCount,
        singleLessonsPurchasedCount: totalSinglePurchases
      }
    });
  } catch (error) {
    console.error('[AdminPayment] Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch payment settings', error: error.message });
  }
};

/**
 * PUT /api/admin/payments/settings
 * Update variable billing rules, trial days, A/B test splits, and gateway keys
 */
export const updatePaymentSettings = async (req, res) => {
  try {
    const {
      paywallEnabled,
      subscriptionMode,
      freeTrialDays,
      freeModulesAllowance,
      defaultPricingModel,
      abTesting,
      segmentRules,
      whitelistedPhones,
      razorpay
    } = req.body;

    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = new PaymentConfig({ singletonKey: 'default' });
    }

    if (paywallEnabled !== undefined) config.paywallEnabled = Boolean(paywallEnabled);
    if (subscriptionMode) config.subscriptionMode = subscriptionMode;
    if (freeTrialDays !== undefined) config.freeTrialDays = Number(freeTrialDays);
    if (freeModulesAllowance !== undefined) config.freeModulesAllowance = Number(freeModulesAllowance);
    if (defaultPricingModel) config.defaultPricingModel = defaultPricingModel;
    if (abTesting) config.abTesting = abTesting;
    if (segmentRules) config.segmentRules = segmentRules;
    if (whitelistedPhones) config.whitelistedPhones = whitelistedPhones;
    if (razorpay) {
      config.razorpay = {
        ...config.razorpay,
        ...razorpay
      };
    }

    await config.save();
    res.json({ success: true, message: 'Payment settings updated successfully', config });
  } catch (error) {
    console.error('[AdminPayment] Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update payment settings', error: error.message });
  }
};

/**
 * POST /api/admin/payments/plans
 * Create or update a plan (prices in Rupees)
 */
export const savePlan = async (req, res) => {
  try {
    const { id, code, name, description, type, billingCycle, amount, discountedFrom, features, badge, isActive, sortOrder } = req.body;

    if (!code || !name || amount === undefined) {
      return res.status(400).json({ message: 'code, name, and amount (in ₹) are required' });
    }

    let plan;
    if (id) {
      plan = await SubscriptionPlan.findById(id);
    } else {
      plan = await SubscriptionPlan.findOne({ code });
    }

    if (plan) {
      plan.name = name;
      plan.description = description || plan.description;
      plan.type = type || plan.type;
      plan.billingCycle = billingCycle || plan.billingCycle;
      plan.amount = Number(amount); // In plain Rupees
      plan.discountedFrom = discountedFrom !== undefined ? Number(discountedFrom) : plan.discountedFrom;
      if (features) plan.features = features;
      if (badge !== undefined) plan.badge = badge;
      if (isActive !== undefined) plan.isActive = Boolean(isActive);
      if (sortOrder !== undefined) plan.sortOrder = Number(sortOrder);
      await plan.save();
    } else {
      plan = await SubscriptionPlan.create({
        code,
        name,
        description,
        type: type || 'subscription',
        billingCycle: billingCycle || 'monthly',
        amount: Number(amount),
        discountedFrom: Number(discountedFrom || 0),
        currency: 'INR',
        features: features || [],
        badge: badge || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder || 0
      });
    }

    res.json({ success: true, message: 'Plan saved successfully', plan });
  } catch (error) {
    console.error('[AdminPayment] Error saving plan:', error);
    res.status(500).json({ message: 'Failed to save plan', error: error.message });
  }
};

/**
 * GET /api/admin/payments/transactions
 * Filterable and paginated list of transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', status = 'all', paymentType = 'all' } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (paymentType && paymentType !== 'all') {
      query.paymentType = paymentType;
    }
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { 'userSnapshot.username': { $regex: search, $options: 'i' } },
        { 'userSnapshot.phoneNumber': { $regex: search, $options: 'i' } },
        { 'userSnapshot.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username phone email school classLevel'),
      PaymentTransaction.countDocuments(query)
    ]);

    res.json({
      transactions,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalTransactions: total
    });
  } catch (error) {
    console.error('[AdminPayment] Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
};

/**
 * GET /api/admin/payments/transactions/export-csv
 * CSV export of transaction logs
 */
export const exportTransactionsCSV = async (req, res) => {
  try {
    const transactions = await PaymentTransaction.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username phone email school classLevel');

    const headers = [
      'Date',
      'Order ID',
      'Payment ID',
      'Student Name',
      'Phone Number',
      'Email',
      'School',
      'Class Level',
      'Payment Type',
      'Plan Code',
      'Amount (INR)',
      'Status',
      'A/B Variant'
    ];

    const rows = transactions.map(t => [
      new Date(t.createdAt).toISOString().replace('T', ' ').substring(0, 19),
      `"${t.orderId || ''}"`,
      `"${t.paymentId || ''}"`,
      `"${(t.userSnapshot?.username || t.userId?.username || '').replace(/"/g, '""')}"`,
      `"${t.userSnapshot?.phoneNumber || t.userId?.phone || ''}"`,
      `"${t.userSnapshot?.email || t.userId?.email || ''}"`,
      `"${(t.userSnapshot?.school || t.userId?.school || '').replace(/"/g, '""')}"`,
      `"${t.userSnapshot?.classLevel || t.userId?.classLevel || ''}"`,
      t.paymentType,
      t.planCode,
      t.amount, // In plain Rupees
      t.status,
      t.experimentVariant || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=hoshiyaar_transactions_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('[AdminPayment] Error exporting transactions CSV:', error);
    res.status(500).json({ message: 'Failed to export CSV', error: error.message });
  }
};

/**
 * GET /api/admin/payments/subscriptions
 * View users and their subscription status
 */
export const getSubscriptions = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [subscriptions, total] = await Promise.all([
      UserSubscription.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username phone email school classLevel')
        .populate('activePlan'),
      UserSubscription.countDocuments(query)
    ]);

    res.json({
      subscriptions,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error('[AdminPayment] Error getting subscriptions:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
};
