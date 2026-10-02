import PaymentConfig from '../models/PaymentConfig.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import UserSubscription from '../models/UserSubscription.js';
import User from '../models/User.js';
import Chapter from '../models/Chapter.js';
import Module from '../models/Module.js';
import Subject from '../models/Subject.js';
import ClassLevel from '../models/ClassLevel.js';
import Board from '../models/Board.js';
import { seedDefaultPlans } from './paymentController.js';

/**
 * GET /api/admin/payments/settings
 * Full administrative overview: config, plans, and metrics
 */
export const getPaymentSettings = async (req, res) => {
  try {
    await seedDefaultPlans();
    let config = await PaymentConfig.findOne({ singletonKey: 'default' })
      .populate('abTesting.freeUsers', 'username phone email school classLevel');
    if (!config) {
      config = await PaymentConfig.create({ singletonKey: 'default' });
    }

    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });

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
      defaultLessonPrice,
      defaultFreeLessonsCount,
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
    if (req.body.freeAccessForActiveHomework !== undefined) {
      config.freeAccessForActiveHomework = Boolean(req.body.freeAccessForActiveHomework);
    }
    if (freeTrialDays !== undefined) config.freeTrialDays = Number(freeTrialDays);
    if (freeModulesAllowance !== undefined) config.freeModulesAllowance = Number(freeModulesAllowance);
    if (defaultLessonPrice !== undefined) {
      config.defaultLessonPrice = Number(defaultLessonPrice);
      // Sync pay_per_lesson plan amount
      await SubscriptionPlan.updateMany(
        { code: 'pay_per_lesson' },
        { $set: { amount: Number(defaultLessonPrice) } }
      );
    }
    if (req.body.defaultChapterPrice !== undefined) {
      config.defaultChapterPrice = Number(req.body.defaultChapterPrice);
      await SubscriptionPlan.updateMany(
        { code: 'pay_per_chapter' },
        { $set: { amount: Number(req.body.defaultChapterPrice) } }
      );
    } else if (defaultLessonPrice !== undefined && config.defaultChapterPrice == null) {
      config.defaultChapterPrice = Number(defaultLessonPrice);
      await SubscriptionPlan.updateMany(
        { code: 'pay_per_chapter' },
        { $set: { amount: Number(defaultLessonPrice) } }
      );
    }
    if (defaultFreeLessonsCount !== undefined) config.defaultFreeLessonsCount = Number(defaultFreeLessonsCount);
    if (defaultPricingModel) config.defaultPricingModel = defaultPricingModel;
    if (abTesting) {
      config.abTesting = {
        enabled: Boolean(abTesting.enabled),
        freePercentage: Number(abTesting.freePercentage ?? 0),
        freeUsers: abTesting.freeUsers || config.abTesting?.freeUsers || [],
        freePhones: abTesting.freePhones || config.abTesting?.freePhones || []
      };
    }
    if (segmentRules) config.segmentRules = segmentRules;
    if (whitelistedPhones) config.whitelistedPhones = whitelistedPhones;
    if (razorpay) {
      config.razorpay = {
        ...config.razorpay,
        ...razorpay
      };
    }

    await config.save();
    const populatedConfig = await PaymentConfig.findOne({ singletonKey: 'default' })
      .populate('abTesting.freeUsers', 'username phone email school classLevel');
    res.json({ success: true, message: 'Payment settings updated successfully', config: populatedConfig || config });
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

/**
 * GET /api/payments/admin/chapter-settings
 * Returns all chapters with their subject, module counts, freeLessonsCount, and lessonPrice
 */
export const getChapterPaymentSettings = async (req, res) => {
  try {
    const config = await PaymentConfig.findOne({ singletonKey: 'default' });
    const defaultFreeLessons = config?.defaultFreeLessonsCount ?? 1;
    const defaultPrice = config?.defaultChapterPrice ?? config?.defaultLessonPrice ?? 50;

    const chapters = await Chapter.find()
      .populate({
        path: 'subjectId',
        populate: [
          { path: 'classId', select: 'name order' },
          { path: 'boardId', select: 'name code' }
        ]
      })
      .sort({ 'subjectId': 1, order: 1 })
      .lean();

    // Count modules for each chapter
    const chapterIds = chapters.map(c => c._id);
    const moduleCounts = await Module.aggregate([
      { $match: { chapterId: { $in: chapterIds } } },
      { $group: { _id: '$chapterId', count: { $sum: 1 } } }
    ]);

    const moduleCountMap = new Map();
    moduleCounts.forEach(m => moduleCountMap.set(String(m._id), m.count));

    const result = chapters.map(ch => {
      const customPrice = ch.chapterPrice != null ? ch.chapterPrice : (ch.lessonPrice != null ? ch.lessonPrice : null);
      const sub = ch.subjectId;
      const classLevelVal = sub?.classId?.name || sub?.classLevel || sub?.grade || '';
      const boardVal = sub?.boardId?.name || sub?.board || 'CBSE';

      return {
        _id: ch._id,
        title: ch.title,
        order: ch.order,
        isPublished: ch.isPublished,
        freeLessonsCount: ch.freeLessonsCount != null ? ch.freeLessonsCount : null,
        effectiveFreeLessonsCount: ch.freeLessonsCount != null ? ch.freeLessonsCount : defaultFreeLessons,
        lessonPrice: customPrice,
        effectiveLessonPrice: customPrice != null ? customPrice : defaultPrice,
        chapterPrice: customPrice,
        effectiveChapterPrice: customPrice != null ? customPrice : defaultPrice,
        totalModules: moduleCountMap.get(String(ch._id)) || 0,
        subject: sub ? {
          _id: sub._id,
          name: sub.name,
          board: boardVal,
          classLevel: classLevelVal
        } : null
      };
    });

    res.json({
      chapters: result,
      defaultFreeLessonsCount: defaultFreeLessons,
      defaultLessonPrice: defaultPrice,
      defaultChapterPrice: defaultPrice
    });
  } catch (error) {
    console.error('[AdminPayment] Error getting chapter payment settings:', error);
    res.status(500).json({ message: 'Failed to fetch chapter payment settings', error: error.message });
  }
};

/**
 * PUT /api/payments/admin/chapter-settings/:chapterId
 * Updates freeLessonsCount and lessonPrice/chapterPrice for a specific chapter
 */
export const updateChapterPaymentSettings = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { freeLessonsCount, lessonPrice, chapterPrice } = req.body;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    if (freeLessonsCount !== undefined) {
      chapter.freeLessonsCount = (freeLessonsCount === '' || freeLessonsCount === null) ? null : Math.max(0, Number(freeLessonsCount));
    }
    const resolvedPrice = chapterPrice !== undefined ? chapterPrice : lessonPrice;
    if (resolvedPrice !== undefined) {
      const priceVal = (resolvedPrice === '' || resolvedPrice === null) ? null : Math.max(0, Number(resolvedPrice));
      chapter.chapterPrice = priceVal;
      chapter.lessonPrice = priceVal;
    }

    await chapter.save();

    res.json({
      success: true,
      message: `Chapter '${chapter.title}' updated successfully`,
      chapter: {
        _id: chapter._id,
        title: chapter.title,
        freeLessonsCount: chapter.freeLessonsCount,
        lessonPrice: chapter.lessonPrice,
        chapterPrice: chapter.chapterPrice
      }
    });
  } catch (error) {
    console.error('[AdminPayment] Error updating chapter payment settings:', error);
    res.status(500).json({ message: 'Failed to update chapter payment settings', error: error.message });
  }
};

/**
 * GET /api/payments/admin/abtest/users
 * Search users to view or toggle their A/B status
 */
export const searchAbTestUsers = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = {};
    if (search.trim()) {
      query.$or = [
        { username: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username phone email school classLevel createdAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const config = await PaymentConfig.findOne({ singletonKey: 'default' }).lean();
    const freeUserSet = new Set((config?.abTesting?.freeUsers || []).map(id => String(id)));
    const freePhoneSet = new Set((config?.abTesting?.freePhones || []).map(p => String(p).replace(/\D/g, '')));

    const userIds = users.map(u => u._id);
    const userSubs = await UserSubscription.find({ userId: { $in: userIds } }).select('userId assignedVariant').lean();
    const subMap = new Map();
    userSubs.forEach(s => subMap.set(String(s.userId), s.assignedVariant));

    const enriched = users.map(u => {
      const cleanPhone = String(u.phone || '').replace(/\D/g, '');
      const isFree = freeUserSet.has(String(u._id)) || 
        (cleanPhone && freePhoneSet.has(cleanPhone)) || 
        subMap.get(String(u._id)) === 'free';
      return {
        ...u,
        variant: isFree ? 'free' : 'paid'
      };
    });

    res.json({ users: enriched });
  } catch (error) {
    console.error('[AdminPayment] Error searching users for A/B test:', error);
    res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};

/**
 * POST /api/payments/admin/abtest/toggle-user
 * Toggle a specific user between Free and Paid
 */
export const toggleAbTestUser = async (req, res) => {
  try {
    const { userId, variant } = req.body; // variant: 'free' | 'paid'
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const targetVariant = variant === 'free' ? 'free' : 'paid';
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) config = await PaymentConfig.create({ singletonKey: 'default' });

    if (!config.abTesting) {
      config.abTesting = { enabled: true, freePercentage: 0, freeUsers: [], freePhones: [] };
    }

    const cleanPhone = String(user.phone || '').replace(/\D/g, '');

    if (targetVariant === 'free') {
      if (!config.abTesting.freeUsers.some(id => String(id) === String(userId))) {
        config.abTesting.freeUsers.push(userId);
      }
      if (cleanPhone && !config.abTesting.freePhones.includes(cleanPhone)) {
        config.abTesting.freePhones.push(cleanPhone);
      }
    } else {
      config.abTesting.freeUsers = config.abTesting.freeUsers.filter(id => String(id) !== String(userId));
      if (cleanPhone) {
        config.abTesting.freePhones = config.abTesting.freePhones.filter(p => String(p).replace(/\D/g, '') !== cleanPhone);
      }
    }

    await config.save();

    // Update UserSubscription
    let userSub = await UserSubscription.findOne({ userId });
    if (!userSub) {
      userSub = await UserSubscription.create({
        userId,
        status: targetVariant === 'free' ? 'exempt' : 'free_trial',
        assignedVariant: targetVariant
      });
    } else {
      userSub.assignedVariant = targetVariant;
      await userSub.save();
    }

    const updatedConfig = await PaymentConfig.findOne({ singletonKey: 'default' })
      .populate('abTesting.freeUsers', 'username phone email school classLevel');

    res.json({
      success: true,
      userId,
      variant: targetVariant,
      config: updatedConfig,
      message: `User ${user.username || user.phone} set to ${targetVariant.toUpperCase()}`
    });
  } catch (error) {
    console.error('[AdminPayment] Error toggling A/B test user:', error);
    res.status(500).json({ message: 'Failed to toggle user', error: error.message });
  }
};

