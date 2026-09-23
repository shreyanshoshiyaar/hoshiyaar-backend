import crypto from 'crypto';
import mongoose from 'mongoose';
import PaymentConfig from '../models/PaymentConfig.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import UserSubscription from '../models/UserSubscription.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import razorpayService from '../services/razorpayService.js';

/**
 * Ensures default plans exist in the database
 */
export const seedDefaultPlans = async () => {
  const defaultPlans = [
    {
      code: 'monthly_pass',
      name: 'Monthly Unlimited Pass',
      description: 'Unlimited access to all subjects, chapters, AI feedback, and revision rounds for 30 days.',
      type: 'subscription',
      billingCycle: 'monthly',
      amount: 299, // In Rupees
      discountedFrom: 499, // In Rupees
      currency: 'INR',
      badge: 'Most Popular',
      features: [
        'Full access to all chapters and interactive lessons',
        'Unlimited AI explanations and feedback',
        'Personalized Revision Rounds & Star tests',
        'Exam mode & detailed progress reports',
        'Cancel anytime without lock-in'
      ],
      isActive: true,
      sortOrder: 1
    },
    {
      code: 'annual_pass',
      name: 'Annual Unlimited Pass',
      description: 'Full 1-year unlimited access to all subjects, chapters, AI explanations, and revision rounds.',
      type: 'subscription',
      billingCycle: 'annual',
      amount: 1999, // In Rupees (~₹166/month, 45% discount)
      discountedFrom: 3588, // In Rupees
      currency: 'INR',
      badge: 'Best Value • Save 45%',
      features: [
        '1 Full Year of unlimited learning (Save 45%)',
        'All chapters and subjects unlocked',
        'Unlimited AI explanations and doubts',
        'Revision rounds & Star tests',
        'Priority customer support'
      ],
      isActive: true,
      sortOrder: 2
    },
    {
      code: 'pay_per_lesson',
      name: 'Single Lesson Pass',
      description: 'Permanent unlock for this specific lesson with full interactive practice.',
      type: 'pay_per_lesson',
      billingCycle: 'per_lesson',
      amount: 19, // In Rupees
      discountedFrom: 29, // In Rupees
      currency: 'INR',
      badge: 'Pay as you go',
      features: [
        'Permanent access to this chosen lesson',
        'Interactive quizzes & fill-in-the-blanks',
        'Instant AI grading & feedback',
        'Lifetime access on this account'
      ],
      isActive: true,
      sortOrder: 3
    }
  ];

  for (const planData of defaultPlans) {
    const existing = await SubscriptionPlan.findOne({ code: planData.code });
    if (!existing) {
      await SubscriptionPlan.create(planData);
      console.log(`[Payment] Seeded default plan: ${planData.code} (${planData.name})`);
    }
  }
};

/**
 * Assigns a deterministic A/B testing variant based on user ID
 */
const determineUserVariant = (userId, abTestingConfig) => {
  if (!abTestingConfig?.enabled) {
    return 'hybrid';
  }

  const variants = abTestingConfig.variants || {};
  const controlPct = variants.control_free?.percentage ?? 10;
  const monthlyPct = variants.monthly_only?.percentage ?? 30;
  const perLessonPct = variants.pay_per_lesson_only?.percentage ?? 30;
  // remaining goes to hybrid

  // Hash user ID to an integer between 0 and 99
  const hash = crypto.createHash('md5').update(String(userId)).digest('hex');
  const bucket = parseInt(hash.substring(0, 4), 16) % 100;

  if (bucket < controlPct) {
    return 'control_free';
  } else if (bucket < controlPct + monthlyPct) {
    return 'monthly_only';
  } else if (bucket < controlPct + monthlyPct + perLessonPct) {
    return 'pay_per_lesson_only';
  } else {
    return 'hybrid';
  }
};

/**
 * GET /api/payments/config
 * Public / Student configuration
 */
export const getPublicConfig = async (req, res) => {
  try {
    await seedDefaultPlans();
    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await PaymentConfig.create({ singletonKey: 'default' });
    }

    const { keyId, mockMode } = await razorpayService.getClient();
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });

    res.json({
      paywallEnabled: config.paywallEnabled,
      subscriptionMode: config.subscriptionMode || 'admin_only',
      freeTrialDays: config.freeTrialDays,
      mockMode,
      razorpayKeyId: keyId,
      plans
    });
  } catch (error) {
    console.error('[Payment] Error fetching public config:', error);
    res.status(500).json({ message: 'Failed to fetch payment configuration', error: error.message });
  }
};

/**
 * POST /api/payments/check-access
 * Central gatekeeper: Evaluates trial, active subscriptions, single purchases, whitelists, and A/B testing
 */
export const checkAccess = async (req, res) => {
  try {
    const { moduleId } = req.body;
    const user = req.user;

    await seedDefaultPlans();
    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await PaymentConfig.create({ singletonKey: 'default' });
    }

    // 1. Master Switch: If paywall is globally disabled or mode is disabled, open access
    if (!config.paywallEnabled || config.subscriptionMode === 'disabled') {
      return res.json({
        hasAccess: true,
        reason: 'paywall_disabled',
        message: 'Platform is currently in open access mode'
      });
    }

    // If user is not logged in, require login
    if (!user) {
      return res.status(401).json({
        hasAccess: false,
        reason: 'login_required',
        message: 'Please sign in to access this lesson'
      });
    }

    // 2. Identify Admin / Whitelist Privileges
    const previewMode = String(req.headers['x-admin-preview-mode'] || req.body?.previewMode || '').toLowerCase();
    const cleanPhone = String(user.phone || '').replace(/\D/g, '');
    const adminPhones = ['9867735936', '7021970672', '9820277252'];
    const adminUsernames = ['Host', 'hostcbse', 'AKSHITRAVULA', 'AKSHIT', 'SB10', 'Nidhi sekhri'];
    const isAdminUser = 
      user.role === 'admin' || 
      user.role === 'master' ||
      (user.username && adminUsernames.includes(user.username)) ||
      adminPhones.some(p => cleanPhone.endsWith(p)) ||
      config.whitelistedUsers?.some(id => id.toString() === user._id.toString()) ||
      config.whitelistedPhones?.some(p => cleanPhone.endsWith(p.replace(/\D/g, '')));

    // If subscriptionMode is 'admin_only' (default) and current user is NOT an admin:
    // Students/normal users get 100% free open access with zero paywalls!
    const isModeAdminOnly = (config.subscriptionMode || 'admin_only') === 'admin_only';
    if (isModeAdminOnly && !isAdminUser) {
      return res.json({
        hasAccess: true,
        reason: 'open_access_for_students',
        message: 'Platform content is currently open for all students'
      });
    }

    // If admin is browsing in regular admin mode (not student preview), bypass with admin privileges
    if (isAdminUser && previewMode !== 'student') {
      return res.json({
        hasAccess: true,
        reason: 'whitelisted',
        message: 'Access granted via administrative privileges'
      });
    }

    // Find or create UserSubscription record
    let userSub = await UserSubscription.findOne({ userId: user._id });
    if (!userSub) {
      const initialVariant = determineUserVariant(user._id, config.abTesting);
      userSub = await UserSubscription.create({
        userId: user._id,
        status: 'free_trial',
        firstActiveDate: user.createdAt || new Date(),
        assignedVariant: initialVariant
      });
    }

    // Ensure variant is assigned
    if (!userSub.assignedVariant) {
      userSub.assignedVariant = determineUserVariant(user._id, config.abTesting);
      await userSub.save();
    }

    // 3. User Segment Overrides (Class level, School, Board)
    if (config.segmentRules && config.segmentRules.length > 0) {
      for (const rule of config.segmentRules) {
        let matches = false;
        if (rule.segmentType === 'classLevel' && user.classLevel === rule.segmentValue) matches = true;
        if (rule.segmentType === 'school' && user.school?.toLowerCase() === rule.segmentValue?.toLowerCase()) matches = true;
        if (rule.segmentType === 'board' && user.board === rule.segmentValue) matches = true;

        if (matches) {
          if (rule.action === 'free') {
            return res.json({
              hasAccess: true,
              reason: 'segment_exempt',
              message: `Special free access granted for ${rule.segmentValue}`
            });
          }
        }
      }
    }

    // 4. Active Subscription / Canceled Grace Period Check
    if ((userSub.status === 'active_subscription' || userSub.status === 'canceled') && userSub.currentPeriodEnd) {
      if (new Date(userSub.currentPeriodEnd) > new Date()) {
        return res.json({
          hasAccess: true,
          reason: userSub.status === 'canceled' ? 'canceled_grace_period' : 'active_subscription',
          currentPeriodEnd: userSub.currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(userSub.cancelAtPeriodEnd || userSub.status === 'canceled'),
          message: userSub.status === 'canceled' 
            ? 'Access active until end of billing cycle' 
            : 'Active subscription pass'
        });
      } else {
        // Subscription has expired
        userSub.status = 'expired';
        userSub.cancelAtPeriodEnd = false;
        await userSub.save();
      }
    }

    // 5. Pay-Per-Lesson Check: Did the student buy this specific module?
    if (moduleId && userSub.purchasedModules?.some(m => String(m.moduleId) === String(moduleId))) {
      return res.json({
        hasAccess: true,
        reason: 'module_purchased',
        message: 'Lesson previously unlocked'
      });
    }

    // 5b. First Lesson Free Preview: The first lesson of each module/chapter is free for everyone
    if (moduleId) {
      try {
        const modDoc = mongoose.isValidObjectId(moduleId) ? await Module.findById(moduleId).lean() : null;
        if (modDoc) {
          const filter = modDoc.unitId ? { unitId: modDoc.unitId } : { chapterId: modDoc.chapterId };
          const firstMod = await Module.findOne(filter).sort({ order: 1, createdAt: 1 }).lean();
          if (firstMod && String(firstMod._id) === String(modDoc._id)) {
            return res.json({
              hasAccess: true,
              reason: 'first_lesson_free',
              message: 'First lesson of each module is free!'
            });
          }
        }
      } catch (e) {
        console.warn('[Payment] First lesson lookup error:', e);
      }
    }

    // 6. Free Trial Window Evaluation (Configurable, bypassed in student preview)
    if (previewMode !== 'student') {
      const firstActive = userSub.firstActiveDate || user.createdAt || new Date();
      const daysSinceStart = Math.floor((Date.now() - new Date(firstActive).getTime()) / (1000 * 60 * 60 * 24));
      const trialDaysConfigured = config.freeTrialDays || 0;

      if (trialDaysConfigured > 0 && daysSinceStart < trialDaysConfigured) {
        const daysRemaining = trialDaysConfigured - daysSinceStart;
        return res.json({
          hasAccess: true,
          reason: 'free_trial',
          daysElapsed: daysSinceStart,
          daysRemaining: Math.max(1, daysRemaining),
          totalTrialDays: trialDaysConfigured,
          message: `Enjoying free trial: ${daysRemaining} day(s) remaining`
        });
      }
    }

    // 7. A/B Testing: Control Group (100% Free / No Paywall)
    if (userSub.assignedVariant === 'control_free') {
      return res.json({
        hasAccess: true,
        reason: 'ab_test_control_free',
        variant: 'control_free',
        message: 'Access granted'
      });
    }

    // 8. Otherwise: Paywall applies! Fetch relevant plans for this student's A/B variant
    const allPlans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    let offeredPlans = allPlans;

    if (userSub.assignedVariant === 'monthly_only') {
      offeredPlans = allPlans.filter(p => p.type === 'subscription');
    } else if (userSub.assignedVariant === 'pay_per_lesson_only') {
      offeredPlans = allPlans.filter(p => p.type === 'pay_per_lesson');
    }

    const { keyId, mockMode } = await razorpayService.getClient();

    return res.json({
      hasAccess: false,
      reason: 'paywall_required',
      variant: userSub.assignedVariant || 'hybrid',
      totalTrialDays: trialDaysConfigured,
      daysElapsed: daysSinceStart,
      mockMode,
      razorpayKeyId: keyId,
      plans: offeredPlans
    });
  } catch (error) {
    console.error('[Payment] Error in checkAccess:', error);
    res.status(500).json({ message: 'Error verifying module access', error: error.message });
  }
};

/**
 * GET /api/payments/user-status
 * Returns current user subscription status, trial countdown, and purchased items
 */
export const getUserStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'User not authenticated' });

    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) config = await PaymentConfig.create({ singletonKey: 'default' });

    let userSub = await UserSubscription.findOne({ userId: user._id }).populate('activePlan');
    if (!userSub) {
      const initialVariant = determineUserVariant(user._id, config.abTesting);
      userSub = await UserSubscription.create({
        userId: user._id,
        status: 'free_trial',
        firstActiveDate: user.createdAt || new Date(),
        assignedVariant: initialVariant
      });
    }

    const previewMode = String(req.headers['x-admin-preview-mode'] || req.query?.previewMode || '').toLowerCase();
    const isStudentPreview = previewMode === 'student';

    const firstActive = userSub.firstActiveDate || user.createdAt || new Date();
    const daysSinceStart = Math.floor((Date.now() - new Date(firstActive).getTime()) / (1000 * 60 * 60 * 24));
    const trialDaysConfigured = isStudentPreview ? 0 : (config.freeTrialDays || 0);
    const isTrialActive = trialDaysConfigured > 0 && daysSinceStart < trialDaysConfigured;
    const daysRemaining = Math.max(0, trialDaysConfigured - daysSinceStart);

    let enrichedPurchasedModules = [];
    if (userSub.purchasedModules && userSub.purchasedModules.length > 0) {
      try {
        const validIds = userSub.purchasedModules
          .map(m => m.moduleId)
          .filter(id => mongoose.isValidObjectId(id));
        const modules = await Module.find({ _id: { $in: validIds } })
          .populate('chapterId', 'name title')
          .lean();
        const moduleMap = new Map();
        modules.forEach(mod => {
          moduleMap.set(String(mod._id), mod);
        });

        enrichedPurchasedModules = userSub.purchasedModules.map(p => {
          const mod = moduleMap.get(String(p.moduleId));
          return {
            moduleId: String(p.moduleId),
            title: mod?.title || `Lesson ${p.moduleId}`,
            chapterId: mod?.chapterId?._id ? String(mod.chapterId._id) : undefined,
            chapterTitle: mod?.chapterId?.title || mod?.chapterId?.name || '',
            purchasedAt: p.purchasedAt,
            amountPaid: p.amountPaid || 19,
            orderId: p.orderId || ''
          };
        });
      } catch (err) {
        console.warn('[Payment] Error enriching purchased modules:', err);
        enrichedPurchasedModules = userSub.purchasedModules;
      }
    }

    // Also fetch captured payment transactions for user's payment history
    let paymentHistory = [];
    try {
      paymentHistory = await PaymentTransaction.find({
        userId: user._id,
        status: 'captured'
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    } catch (err) {
      console.warn('[Payment] Error fetching payment transactions:', err);
    }

    res.json({
      status: isStudentPreview ? 'free_trial' : userSub.status,
      activePlan: isStudentPreview ? null : userSub.activePlan,
      currentPeriodStart: isStudentPreview ? null : userSub.currentPeriodStart,
      currentPeriodEnd: isStudentPreview ? null : userSub.currentPeriodEnd,
      cancelAtPeriodEnd: isStudentPreview ? false : Boolean(userSub.cancelAtPeriodEnd || userSub.status === 'canceled'),
      canceledAt: isStudentPreview ? null : userSub.canceledAt,
      isTrialActive,
      trialDaysRemaining: daysRemaining,
      totalTrialDays: trialDaysConfigured,
      purchasedModulesCount: enrichedPurchasedModules.length,
      purchasedModules: enrichedPurchasedModules,
      paymentHistory: paymentHistory || [],
      assignedVariant: userSub.assignedVariant,
      paywallEnabled: config.paywallEnabled,
      subscriptionMode: config.subscriptionMode || 'admin_only',
      isAdminUser: !isStudentPreview && user.role === 'admin'
    });
  } catch (error) {
    console.error('[Payment] Error getting user status:', error);
    res.status(500).json({ message: 'Failed to get user status', error: error.message });
  }
};

/**
 * POST /api/payments/create-order (and /api/create-order)
 * Creates a Razorpay order for checkout
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt, notes, planCode, moduleId, moduleIds } = req.body;
    const user = req.user;

    // Case 1: Subscription or pay-per-lesson plan checkout
    if (planCode) {
      if (!user) {
        return res.status(401).json({ message: 'Authentication required to create subscription order' });
      }

      const plan = await SubscriptionPlan.findOne({ code: planCode, isActive: true });
      if (!plan) {
        return res.status(404).json({ message: `Plan '${planCode}' not found or inactive` });
      }

      let amountRupees = plan.amount;
      let itemDetails = {};

      if (plan.type === 'pay_per_lesson') {
        const targetModuleIds = Array.isArray(moduleIds) && moduleIds.length > 0 
          ? moduleIds 
          : (moduleId ? [moduleId] : []);

        if (targetModuleIds.length === 0) {
          return res.status(400).json({ message: 'moduleId or moduleIds is required for pay-per-lesson purchase' });
        }

        const unitPrice = plan.amount || 19;
        amountRupees = unitPrice * targetModuleIds.length;

        const validObjIds = targetModuleIds.filter(id => mongoose.isValidObjectId(id));
        const mods = validObjIds.length > 0 ? await Module.find({ _id: { $in: validObjIds } }).lean() : [];
        const moduleTitles = mods.map(m => m.title);

        itemDetails = {
          moduleId: targetModuleIds[0],
          moduleTitle: mods[0]?.title || `Lesson ${targetModuleIds[0]}`,
          chapterTitle: mods[0]?.chapterTitle || '',
          moduleIds: targetModuleIds,
          moduleTitles: moduleTitles,
          count: targetModuleIds.length,
          unitPrice
        };
      }

      const rcpt = receipt || `rcpt_${user._id.toString().substring(0, 6)}_${Date.now()}`;
      const targetModuleIdsList = itemDetails.moduleIds || (moduleId ? [moduleId] : []);
      
      const orderResult = await razorpayService.createOrder({
        amountRupees,
        currency: plan.currency || currency || 'INR',
        receipt: rcpt,
        notes: {
          userId: user._id.toString(),
          planCode: plan.code,
          moduleId: targetModuleIdsList[0] || '',
          moduleIds: targetModuleIdsList.join(','),
          count: String(targetModuleIdsList.length || 1),
          ...(notes || {})
        }
      });

      const userSub = await UserSubscription.findOne({ userId: user._id });

      const transaction = await PaymentTransaction.create({
        orderId: orderResult.order_id || orderResult.orderId,
        userId: user._id,
        amount: amountRupees,
        currency: orderResult.currency,
        status: 'created',
        paymentType: plan.type === 'subscription' ? 'subscription' : 'pay_per_lesson',
        planCode: plan.code,
        itemDetails,
        userSnapshot: {
          username: user.username,
          phoneNumber: user.phone,
          email: user.email,
          school: user.school,
          classLevel: user.classLevel
        },
        experimentVariant: userSub?.assignedVariant || 'hybrid'
      });

      return res.json({
        success: true,
        order_id: orderResult.order_id || orderResult.orderId,
        orderId: orderResult.order_id || orderResult.orderId,
        amount: orderResult.amountInPaise, // In paise per Razorpay standard spec
        amountRupees,
        amountInPaise: orderResult.amountInPaise,
        currency: orderResult.currency,
        receipt: rcpt,
        keyId: orderResult.keyId,
        mockMode: orderResult.mockMode,
        transactionId: transaction._id,
        plan: {
          code: plan.code,
          name: plan.name,
          type: plan.type
        }
      });
    }

    // Case 2: Standard generic Razorpay order (direct amount in paise or standard rupees)
    if (amount !== undefined && amount !== null) {
      const orderAmountPaise = Number(amount);
      if (isNaN(orderAmountPaise) || orderAmountPaise < 100) {
        return res.status(400).json({ message: 'Amount must be at least 100 paise' });
      }

      const rcpt = receipt || `rcpt_${Date.now()}`;
      const orderResult = await razorpayService.createOrder({
        amount: orderAmountPaise,
        currency: currency || 'INR',
        receipt: rcpt,
        notes: notes || {}
      });

      if (user) {
        await PaymentTransaction.create({
          orderId: orderResult.order_id || orderResult.orderId,
          userId: user._id,
          amount: orderAmountPaise / 100,
          currency: orderResult.currency,
          status: 'created',
          paymentType: 'custom',
          itemDetails: { amountPaise: orderAmountPaise, receipt: rcpt }
        });
      }

      return res.json({
        success: true,
        order_id: orderResult.order_id || orderResult.orderId,
        orderId: orderResult.order_id || orderResult.orderId,
        amount: orderResult.amountInPaise,
        amountInPaise: orderResult.amountInPaise,
        amountRupees: orderAmountPaise / 100,
        currency: orderResult.currency,
        receipt: rcpt,
        keyId: orderResult.keyId,
        mockMode: orderResult.mockMode
      });
    }

    return res.status(400).json({ message: 'Either planCode or amount (in paise >= 100) is required' });
  } catch (error) {
    console.error('[Payment] Error creating order:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Failed to create payment order', error: error.message });
  }
};

/**
 * POST /api/payments/verify (and /api/verify-payment)
 * Cryptographically verifies Razorpay payment and grants entitlement
 */
export const verifyPayment = async (req, res) => {
  try {
    const orderId = req.body.order_id || req.body.orderId || req.body.razorpay_order_id;
    const paymentId = req.body.payment_id || req.body.paymentId || req.body.razorpay_payment_id;
    const signature = req.body.signature || req.body.razorpay_signature;
    const { planCode, moduleId, moduleIds } = req.body;
    const user = req.user;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: order_id, payment_id, and signature are required' 
      });
    }

    // Verify HMAC-SHA256 signature
    const verification = await razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    if (!verification.isValid) {
      // Signature mismatch: return 400, do NOT mark as paid
      await PaymentTransaction.findOneAndUpdate(
        { orderId },
        { status: 'failed', paymentId, signature }
      );
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed: Signature mismatch' 
      });
    }

    // Update Transaction to captured
    const transaction = await PaymentTransaction.findOneAndUpdate(
      { orderId },
      {
        paymentId,
        signature,
        status: 'captured'
      },
      { new: true }
    );


    const plan = await SubscriptionPlan.findOne({ code: planCode || transaction?.planCode });
    const isSubscription = plan?.type === 'subscription';

    const userId = user?._id || transaction?.userId;
    let unlockedCount = 0;
    let userSub = null;

    if (userId) {
      userSub = await UserSubscription.findOne({ userId });
      if (!userSub) {
        userSub = new UserSubscription({ userId });
      }
    }

    if (isSubscription) {
      const now = new Date();
      // If user currently has active subscription time, extend it; otherwise start from now
      const baseTime = (userSub.currentPeriodEnd && new Date(userSub.currentPeriodEnd) > now)
        ? new Date(userSub.currentPeriodEnd).getTime()
        : now.getTime();

      const durationDays = plan.billingCycle === 'annual' ? 365 : 30;
      const periodEnd = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000);

      userSub.status = 'active_subscription';
      userSub.activePlan = plan._id;
      if (!userSub.currentPeriodStart || new Date(userSub.currentPeriodEnd) <= now) {
        userSub.currentPeriodStart = now;
      }
      userSub.currentPeriodEnd = periodEnd;
    } else {
      // Pay-Per-Lesson purchase (supports single or multi-lesson)
      const targetModuleIds = (Array.isArray(moduleIds) && moduleIds.length > 0)
        ? moduleIds
        : (transaction?.itemDetails?.moduleIds?.length 
            ? transaction.itemDetails.moduleIds 
            : (moduleId || transaction?.itemDetails?.moduleId ? [moduleId || transaction.itemDetails.moduleId] : []));

      const unitPrice = transaction?.itemDetails?.unitPrice || plan?.amount || 19;

      for (const mId of targetModuleIds) {
        const alreadyPurchased = userSub.purchasedModules.some(m => String(m.moduleId) === String(mId));
        if (!alreadyPurchased) {
          userSub.purchasedModules.push({
            moduleId: mId,
            purchasedAt: new Date(),
            amountPaid: unitPrice,
            orderId
          });
          unlockedCount++;
        }
      }
    }

    if (userSub) {
      await userSub.save();
    }

    res.json({
      success: true,
      message: isSubscription 
        ? `${plan.billingCycle === 'annual' ? 'Annual' : 'Monthly'} pass activated! Enjoy full unlimited access.` 
        : (userSub ? `${unlockedCount > 1 ? `${unlockedCount} lessons` : 'Lesson'} unlocked successfully!` : 'Payment signature verified successfully'),
      transactionId: transaction?._id,
      paymentId,
      orderId,
      subscription: userSub ? {
        status: userSub.status,
        currentPeriodEnd: userSub.currentPeriodEnd,
        purchasedModules: userSub.purchasedModules
      } : null
    });
  } catch (error) {
    console.error('[Payment] Error verifying payment:', error);
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

/**
 * POST /api/payments/mock-success
 * Instant 1-click test checkout for Sandbox / Mock mode
 */
export const mockSuccessPayment = async (req, res) => {
  try {
    const { planCode, moduleId, moduleIds } = req.body;
    const user = req.user;

    const config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config?.razorpay?.mockMode && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Mock sandbox mode is disabled' });
    }

    const plan = await SubscriptionPlan.findOne({ code: planCode, isActive: true });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const mockOrderId = `order_mock_${crypto.randomBytes(6).toString('hex')}`;
    const mockPaymentId = `pay_mock_${crypto.randomBytes(6).toString('hex')}`;

    const targetModuleIds = Array.isArray(moduleIds) && moduleIds.length > 0 
      ? moduleIds 
      : (moduleId ? [moduleId] : []);

    const unitPrice = plan.amount || 19;
    const totalAmount = plan.type === 'pay_per_lesson' 
      ? (unitPrice * (targetModuleIds.length || 1)) 
      : plan.amount;

    let itemDetails = {};
    if (plan.type === 'pay_per_lesson' && targetModuleIds.length > 0) {
      const validObjIds = targetModuleIds.filter(id => mongoose.isValidObjectId(id));
      const mods = validObjIds.length > 0 ? await Module.find({ _id: { $in: validObjIds } }).lean() : [];
      itemDetails = {
        moduleId: targetModuleIds[0],
        moduleTitle: mods[0]?.title || `Lesson ${targetModuleIds[0]}`,
        chapterTitle: mods[0]?.chapterTitle || '',
        moduleIds: targetModuleIds,
        moduleTitles: mods.map(m => m.title),
        count: targetModuleIds.length,
        unitPrice
      };
    }

    // Save transaction
    await PaymentTransaction.create({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: 'mock_signature',
      userId: user._id,
      amount: totalAmount, // In plain Rupees
      currency: 'INR',
      status: 'captured',
      paymentType: plan.type === 'subscription' ? 'subscription' : 'pay_per_lesson',
      planCode: plan.code,
      itemDetails,
      userSnapshot: {
        username: user.username,
        phoneNumber: user.phone,
        email: user.email,
        school: user.school,
        classLevel: user.classLevel
      },
      experimentVariant: 'mock_sandbox'
    });

    // Update entitlement
    let userSub = await UserSubscription.findOne({ userId: user._id });
    if (!userSub) userSub = new UserSubscription({ userId: user._id });

    if (plan.type === 'subscription') {
      const now = new Date();
      const baseTime = (userSub.currentPeriodEnd && new Date(userSub.currentPeriodEnd) > now)
        ? new Date(userSub.currentPeriodEnd).getTime()
        : now.getTime();

      const durationDays = plan.billingCycle === 'annual' ? 365 : 30;
      const periodEnd = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000);

      userSub.status = 'active_subscription';
      userSub.activePlan = plan._id;
      if (!userSub.currentPeriodStart || new Date(userSub.currentPeriodEnd) <= now) {
        userSub.currentPeriodStart = now;
      }
      userSub.currentPeriodEnd = periodEnd;
    } else if (targetModuleIds.length > 0) {
      for (const mId of targetModuleIds) {
        const already = userSub.purchasedModules.some(m => String(m.moduleId) === String(mId));
        if (!already) {
          userSub.purchasedModules.push({
            moduleId: mId,
            purchasedAt: new Date(),
            amountPaid: unitPrice,
            orderId: mockOrderId
          });
        }
      }
    }

    await userSub.save();

    res.json({
      success: true,
      message: 'Sandbox Mock Payment simulated successfully!',
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      subscription: userSub
    });
  } catch (error) {
    console.error('[Payment] Error in mock payment:', error);
    res.status(500).json({ message: 'Mock payment failed', error: error.message });
  }
};

/**
 * POST /api/payments/cancel-subscription
 * Cancels auto-renewal while keeping user access active until currentPeriodEnd
 */
export const cancelSubscription = async (req, res) => {
  try {
    const user = req.user;
    const { reason = '' } = req.body;

    let userSub = await UserSubscription.findOne({ userId: user._id });
    if (!userSub) {
      return res.status(404).json({ message: 'No subscription record found' });
    }

    const hasActivePass = (userSub.status === 'active_subscription' || userSub.status === 'canceled') &&
      userSub.currentPeriodEnd && new Date(userSub.currentPeriodEnd) > new Date();

    if (!hasActivePass) {
      return res.status(400).json({ message: 'You do not have an active subscription pass to cancel' });
    }

    userSub.status = 'canceled';
    userSub.cancelAtPeriodEnd = true;
    userSub.canceledAt = new Date();
    userSub.cancellationReason = reason;
    await userSub.save();

    res.json({
      success: true,
      message: `Your subscription has been canceled. You still have full unlimited access until ${new Date(userSub.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. No further charges will occur.`,
      subscription: {
        status: userSub.status,
        currentPeriodEnd: userSub.currentPeriodEnd,
        cancelAtPeriodEnd: true,
        canceledAt: userSub.canceledAt
      }
    });
  } catch (error) {
    console.error('[Payment] Error canceling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
  }
};

/**
 * POST /api/payments/reactivate-subscription
 * Resumes / reactivates a subscription that was scheduled to end
 */
export const reactivateSubscription = async (req, res) => {
  try {
    const user = req.user;

    let userSub = await UserSubscription.findOne({ userId: user._id });
    if (!userSub) {
      return res.status(404).json({ message: 'No subscription record found' });
    }

    if (userSub.status !== 'canceled' || !userSub.currentPeriodEnd || new Date(userSub.currentPeriodEnd) <= new Date()) {
      return res.status(400).json({ message: 'No canceled subscription eligible to reactivate' });
    }

    userSub.status = 'active_subscription';
    userSub.cancelAtPeriodEnd = false;
    userSub.cancellationReason = '';
    await userSub.save();

    res.json({
      success: true,
      message: 'Subscription reactivated! Your pass remains uninterrupted.',
      subscription: userSub
    });
  } catch (error) {
    console.error('[Payment] Error reactivating subscription:', error);
    res.status(500).json({ message: 'Failed to reactivate subscription', error: error.message });
  }
};
