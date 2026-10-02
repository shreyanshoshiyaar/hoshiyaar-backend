import crypto from 'crypto';
import mongoose from 'mongoose';
import PaymentConfig from '../models/PaymentConfig.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import UserSubscription from '../models/UserSubscription.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Classroom from '../models/Classroom.js';
import Assignment from '../models/Assignment.js';
import razorpayService from '../services/razorpayService.js';

/**
 * Ensures default plans exist in the database
 */
export const seedDefaultPlans = async () => {
  const defaultPlans = [
    {
      code: 'pay_per_chapter',
      name: 'Pay Per Chapter (1 Year Pass)',
      description: '1-Year full unlock for this chapter, including all lessons and Chapter Exam Mode.',
      type: 'pay_per_chapter',
      billingCycle: 'annual',
      amount: 50, // In Rupees
      discountedFrom: 99, // In Rupees
      currency: 'INR',
      badge: '1-Year Chapter Pass',
      features: [
        '1 Full Year unlimited access to this chapter',
        'All lessons and levels in chapter unlocked',
        'Full access to Chapter Exam Mode & AI scoring',
        'Quizzes, interactive feedback & revision cards'
      ],
      isActive: true,
      sortOrder: 1
    }
  ];

  // Remove other legacy plans from DB so only our active plan remains
  await SubscriptionPlan.deleteMany({ code: { $ne: 'pay_per_chapter' } });

  for (const planData of defaultPlans) {
    const existing = await SubscriptionPlan.findOne({ code: planData.code });
    if (!existing) {
      await SubscriptionPlan.create(planData);
      console.log(`[Payment] Seeded default plan: ${planData.code} (${planData.name})`);
    } else {
      if (!existing.isActive || existing.amount !== 50) {
        existing.isActive = true;
        existing.amount = 50;
        await existing.save();
      }
    }
  }
};

/**
 * Assigns a deterministic A/B testing variant: 'paid' (default) vs 'free'
 */
const determineUserVariant = (userId, abTestingConfig, user = null) => {
  if (!abTestingConfig?.enabled) {
    return 'paid'; // Default is PAID for all users
  }

  const userIdStr = String(userId);

  // 1. Check if user is explicitly listed in free users
  if (abTestingConfig.freeUsers?.some(id => String(id) === userIdStr)) {
    return 'free';
  }

  // 2. Check if phone is explicitly listed in free phones
  if (user?.phone) {
    const cleanPhone = String(user.phone).replace(/\D/g, '');
    if (cleanPhone && abTestingConfig.freePhones?.some(p => cleanPhone.endsWith(String(p).replace(/\D/g, '')))) {
      return 'free';
    }
  }

  // 3. Percentage-based free allocation (0% by default, 100% paid)
  const freePct = Number(abTestingConfig.freePercentage ?? 0);
  if (freePct <= 0) return 'paid';
  if (freePct >= 100) return 'free';

  // Deterministic MD5 hash to 0-99
  const hash = crypto.createHash('md5').update(userIdStr).digest('hex');
  const bucket = parseInt(hash.substring(0, 4), 16) % 100;

  return bucket < freePct ? 'free' : 'paid';
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
      freeAccessForActiveHomework: config.freeAccessForActiveHomework !== false,
      freeTrialDays: config.freeTrialDays,
      defaultLessonPrice: config.defaultLessonPrice || 50,
      defaultChapterPrice: config.defaultChapterPrice || config.defaultLessonPrice || 50,
      defaultFreeLessonsCount: config.defaultFreeLessonsCount || 1,
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
    const { moduleId, chapterId: paramChapterId, checkType } = req.body;
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
        message: 'Please sign in to access this content'
      });
    }

    // 2. Identify Admin / Whitelist Privileges
    const previewMode = String(req.headers['x-admin-preview-mode'] || req.body?.previewMode || '').toLowerCase();
    const cleanPhone = String(user.phone || '').replace(/\D/g, '');
    const adminPhones = ['9867735936', '7021970672', '9820277252', '8310532323'];
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
      const initialVariant = determineUserVariant(user._id, config.abTesting, user);
      userSub = await UserSubscription.create({
        userId: user._id,
        status: 'free_trial',
        firstActiveDate: user.createdAt || new Date(),
        assignedVariant: initialVariant
      });
    }

    // Ensure variant is assigned and kept in sync
    const cleanUserPhone = String(user.phone || '').replace(/\D/g, '');
    const isExplicitFreeUser = 
      config.abTesting?.freeUsers?.some(id => String(id) === String(user._id)) ||
      (cleanUserPhone && config.abTesting?.freePhones?.some(p => cleanUserPhone.endsWith(String(p).replace(/\D/g, ''))));

    if (isExplicitFreeUser && userSub.assignedVariant !== 'free') {
      userSub.assignedVariant = 'free';
      await userSub.save();
    } else if (!userSub.assignedVariant) {
      userSub.assignedVariant = determineUserVariant(user._id, config.abTesting, user);
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

    // Resolve chapter details if moduleId or paramChapterId is provided
    let effectiveChapterId = paramChapterId ? String(paramChapterId) : null;
    let modDoc = null;
    if (moduleId && mongoose.isValidObjectId(moduleId)) {
      try {
        modDoc = await Module.findById(moduleId).lean();
        if (modDoc?.chapterId) effectiveChapterId = String(modDoc.chapterId);
      } catch (e) {
        console.warn('[Payment] Error fetching module doc for chapterId:', e);
      }
    }

    let chapterDoc = null;
    if (effectiveChapterId && mongoose.isValidObjectId(effectiveChapterId)) {
      try {
        chapterDoc = await Chapter.findById(effectiveChapterId).lean();
      } catch (e) {
        console.warn('[Payment] Error fetching chapter doc:', e);
      }
    }

    // 5. Pay-Per-Chapter Check: Did the student unlock this chapter for 1 year?
    if (effectiveChapterId) {
      const activeChapterPurchase = userSub.purchasedChapters?.find(c => 
        String(c.chapterId) === String(effectiveChapterId) && new Date(c.expiresAt) > new Date()
      );
      if (activeChapterPurchase) {
        return res.json({
          hasAccess: true,
          reason: 'chapter_purchased',
          chapterId: effectiveChapterId,
          chapterTitle: chapterDoc?.title || '',
          expiresAt: activeChapterPurchase.expiresAt,
          message: 'Chapter unlocked (1-Year Pass)'
        });
      }
    }

    // 5a. Classroom Homework Check: Free chapter access for active homework
    // If student is enrolled in a classroom and has an active assignment for this chapter/module,
    // grant 100% free access (including Exam Mode) until homework dueDate passes.
    if (config.freeAccessForActiveHomework !== false && user?._id) {
      try {
        const studentClassrooms = await Classroom.find({ students: user._id, isActive: true }).select('_id').lean();
        if (studentClassrooms.length > 0) {
          const classroomIds = studentClassrooms.map(c => c._id);
          const activeAssignments = await Assignment.find({
            classroomId: { $in: classroomIds },
            status: 'active',
            dueDate: { $gt: new Date() }
          }).lean();

          if (activeAssignments.length > 0) {
            const chapTitle = (chapterDoc?.title || chapterDoc?.name || '').trim().toLowerCase();
            const matchesAssignment = activeAssignments.find(a => {
              // Direct chapterId match
              if (effectiveChapterId && a.chapterId && String(a.chapterId) === String(effectiveChapterId)) {
                return true;
              }
              // Chapter title match (case-insensitive)
              if (chapTitle && a.chapterTitle && a.chapterTitle.trim().toLowerCase() === chapTitle) {
                return true;
              }
              // Module ID match
              if (moduleId && a.targetLessons?.some(l => String(l.moduleId) === String(moduleId))) {
                return true;
              }
              return false;
            });

            if (matchesAssignment) {
              return res.json({
                hasAccess: true,
                reason: 'active_homework_free_access',
                chapterId: effectiveChapterId || matchesAssignment.chapterId,
                chapterTitle: matchesAssignment.chapterTitle || chapterDoc?.title || '',
                dueDate: matchesAssignment.dueDate,
                assignmentTitle: matchesAssignment.title,
                message: `Free access granted for active homework: ${matchesAssignment.title}`
              });
            }
          }
        }
      } catch (hwErr) {
        console.warn('[Payment] Error checking active homework access in checkAccess:', hwErr);
      }
    }

    // 5b. If checking for Exam Mode specifically:
    // Exam mode requires unlocking the chapter (1-Year Pass)
    const { keyId, mockMode } = await razorpayService.getClient();
    const allPlans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });

    if (checkType === 'exam' || (!moduleId && effectiveChapterId)) {
      return res.json({
        hasAccess: false,
        reason: 'chapter_exam_locked',
        chapterId: effectiveChapterId,
        chapterTitle: chapterDoc?.title || '',
        chapterPrice: chapterDoc?.chapterPrice ?? chapterDoc?.lessonPrice ?? config.defaultChapterPrice ?? 50,
        mockMode,
        razorpayKeyId: keyId,
        plans: allPlans,
        message: 'Exam Mode requires unlocking this chapter (1-Year Pass)'
      });
    }

    // 5b. Pay-Per-Lesson Check: Did the student buy this specific module? (legacy support)
    if (moduleId && userSub.purchasedModules?.some(m => String(m.moduleId) === String(moduleId))) {
      return res.json({
        hasAccess: true,
        reason: 'module_purchased',
        message: 'Lesson previously unlocked'
      });
    }

    // 5c. Dynamic Free Levels Preview: Check if this lesson falls within free level quota for this chapter
    if (moduleId && modDoc) {
      try {
        const freeCount = chapterDoc?.freeLessonsCount != null
          ? Number(chapterDoc.freeLessonsCount)
          : (config.defaultFreeLessonsCount ?? 1);

        const filter = modDoc.unitId ? { unitId: modDoc.unitId } : { chapterId: modDoc.chapterId };
        const chapterModules = await Module.find(filter).sort({ order: 1, createdAt: 1 }).select('_id').lean();
        const modIndex = chapterModules.findIndex(m => String(m._id) === String(modDoc._id));

        if (modIndex !== -1 && modIndex < freeCount) {
          return res.json({
            hasAccess: true,
            reason: 'free_lesson_preview',
            freeLessonsCount: freeCount,
            lessonIndex: modIndex,
            message: `Level ${modIndex + 1} is free in this chapter!`
          });
        }
      } catch (e) {
        console.warn('[Payment] Free lesson lookup error:', e);
      }
    }

    // 6. Free Trial Window Evaluation (Configurable, bypassed in student preview)
    const firstActive = userSub.firstActiveDate || user.createdAt || new Date();
    const daysSinceStart = Math.floor((Date.now() - new Date(firstActive).getTime()) / (1000 * 60 * 60 * 24));
    const trialDaysConfigured = previewMode === 'student' ? 0 : (config.freeTrialDays || 0);

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

    // 7. A/B Testing: Free Group (100% Free / Zero Paywall)
    if (isExplicitFreeUser || userSub.assignedVariant === 'free' || userSub.assignedVariant === 'control_free') {
      return res.json({
        hasAccess: true,
        reason: 'ab_test_free',
        variant: 'free',
        message: 'Access granted via Free Test Group'
      });
    }

    // 8. Otherwise: Paywall applies! (Default: Paid for all users)
    return res.json({
      hasAccess: false,
      reason: 'paywall_required',
      variant: userSub.assignedVariant || 'paid',
      chapterId: effectiveChapterId,
      chapterTitle: chapterDoc?.title || '',
      chapterPrice: chapterDoc?.chapterPrice ?? chapterDoc?.lessonPrice ?? config.defaultChapterPrice ?? 50,
      totalTrialDays: trialDaysConfigured,
      daysElapsed: daysSinceStart,
      mockMode,
      razorpayKeyId: keyId,
      plans: allPlans
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
      const initialVariant = determineUserVariant(user._id, config.abTesting, user);
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
            amountPaid: p.amountPaid || 50,
            orderId: p.orderId || ''
          };
        });
      } catch (err) {
        console.warn('[Payment] Error enriching purchased modules:', err);
        enrichedPurchasedModules = userSub.purchasedModules;
      }
    }

    let enrichedPurchasedChapters = [];
    if (userSub.purchasedChapters && userSub.purchasedChapters.length > 0) {
      try {
        const validChapIds = userSub.purchasedChapters
          .map(c => c.chapterId)
          .filter(id => mongoose.isValidObjectId(id));
        const chapters = await Chapter.find({ _id: { $in: validChapIds } })
          .populate('subjectId', 'name board classLevel grade')
          .lean();
        const chapMap = new Map();
        chapters.forEach(ch => chapMap.set(String(ch._id), ch));

        enrichedPurchasedChapters = userSub.purchasedChapters.map(p => {
          const ch = chapMap.get(String(p.chapterId));
          const isExpired = !p.expiresAt || new Date(p.expiresAt) <= new Date();
          return {
            chapterId: String(p.chapterId),
            title: ch?.title || `Chapter ${p.chapterId}`,
            subjectName: ch?.subjectId?.name || '',
            purchasedAt: p.purchasedAt,
            expiresAt: p.expiresAt,
            isValid: !isExpired,
            amountPaid: p.amountPaid || 50,
            orderId: p.orderId || ''
          };
        });
      } catch (err) {
        console.warn('[Payment] Error enriching purchased chapters:', err);
        enrichedPurchasedChapters = userSub.purchasedChapters;
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

    // Classroom Homework Free Access Chapters
    let homeworkFreeChapters = [];
    if (config.freeAccessForActiveHomework !== false && user?._id) {
      try {
        const studentClassrooms = await Classroom.find({ students: user._id, isActive: true }).select('_id').lean();
        if (studentClassrooms.length > 0) {
          const cIds = studentClassrooms.map(c => c._id);
          const activeAssignments = await Assignment.find({
            classroomId: { $in: cIds },
            status: 'active',
            dueDate: { $gt: new Date() }
          }).lean();

          const chapIdSet = new Set();
          const chapTitleSet = new Set();
          for (const a of activeAssignments) {
            if (a.chapterId) chapIdSet.add(String(a.chapterId));
            if (a.chapterTitle) chapTitleSet.add(a.chapterTitle.trim().toLowerCase());
            if (!a.chapterId && a.targetLessons?.length > 0) {
              const modIds = a.targetLessons.map(l => l.moduleId).filter(id => mongoose.isValidObjectId(id));
              if (modIds.length > 0) {
                const mods = await Module.find({ _id: { $in: modIds } }).select('chapterId').lean();
                mods.forEach(m => {
                  if (m.chapterId) chapIdSet.add(String(m.chapterId));
                });
              }
            }
          }

          if (chapTitleSet.size > 0) {
            const titleRegexes = Array.from(chapTitleSet).map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
            const chaptersByTitle = await Chapter.find({
              $or: [
                { title: { $in: titleRegexes } },
                { name: { $in: titleRegexes } }
              ]
            }).select('_id title').lean();
            chaptersByTitle.forEach(ch => chapIdSet.add(String(ch._id)));
          }

          homeworkFreeChapters = Array.from(chapIdSet);
        }
      } catch (hwErr) {
        console.warn('[Payment] Error fetching active homework chapters for user status:', hwErr);
      }
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
      purchasedChaptersCount: enrichedPurchasedChapters.filter(c => c.isValid).length,
      purchasedChapters: enrichedPurchasedChapters,
      homeworkFreeChapters,
      freeAccessForActiveHomework: config.freeAccessForActiveHomework !== false,
      paymentHistory: paymentHistory || [],
      assignedVariant: userSub.assignedVariant,
      paywallEnabled: config.paywallEnabled,
      subscriptionMode: config.subscriptionMode || 'admin_only',
      defaultLessonPrice: config.defaultLessonPrice || 50,
      defaultChapterPrice: config.defaultChapterPrice || config.defaultLessonPrice || 50,
      defaultFreeLessonsCount: config.defaultFreeLessonsCount || 1,
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
    const { amount, currency, receipt, notes, planCode, moduleId, moduleIds, chapterId } = req.body;
    const user = req.user;

    let config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config) config = await PaymentConfig.create({ singletonKey: 'default' });

    // Case 1: Subscription, pay-per-chapter, or pay-per-lesson plan checkout
    if (planCode) {
      if (!user) {
        return res.status(401).json({ message: 'Authentication required to create payment order' });
      }

      const plan = await SubscriptionPlan.findOne({ code: planCode, isActive: true }) ||
                   await SubscriptionPlan.findOne({ code: 'pay_per_chapter' }) ||
                   await SubscriptionPlan.findOne({ code: planCode });
      if (!plan) {
        return res.status(404).json({ message: `Plan '${planCode}' not found or inactive` });
      }

      let amountRupees = plan.amount;
      let itemDetails = {};

      if (plan.type === 'pay_per_chapter' || plan.code === 'pay_per_chapter' || chapterId) {
        let targetChapterId = chapterId;
        if (!targetChapterId && moduleId && mongoose.isValidObjectId(moduleId)) {
          const mod = await Module.findById(moduleId).lean();
          if (mod?.chapterId) targetChapterId = String(mod.chapterId);
        }

        if (!targetChapterId) {
          return res.status(400).json({ message: 'chapterId is required for chapter unlock' });
        }

        const ch = mongoose.isValidObjectId(targetChapterId) ? await Chapter.findById(targetChapterId).lean() : null;
        const unitPrice = ch?.chapterPrice ?? ch?.lessonPrice ?? plan.amount ?? config.defaultChapterPrice ?? 50;
        amountRupees = Number(unitPrice);

        itemDetails = {
          chapterId: String(targetChapterId),
          chapterTitle: ch?.title || `Chapter ${targetChapterId}`,
          validityDays: 365,
          unitPrice
        };
      } else if (plan.type === 'pay_per_lesson') {
        const targetModuleIds = Array.isArray(moduleIds) && moduleIds.length > 0 
          ? moduleIds 
          : (moduleId ? [moduleId] : []);

        if (targetModuleIds.length === 0) {
          return res.status(400).json({ message: 'moduleId or moduleIds is required for pay-per-lesson purchase' });
        }

        let unitPrice = plan.amount || config.defaultLessonPrice || 50;
        const validObjIds = targetModuleIds.filter(id => mongoose.isValidObjectId(id));
        const mods = validObjIds.length > 0 ? await Module.find({ _id: { $in: validObjIds } }).lean() : [];
        if (mods.length === 1 && mods[0].chapterId) {
          const ch = await Chapter.findById(mods[0].chapterId).lean();
          if (ch?.lessonPrice != null && ch.lessonPrice > 0) {
            unitPrice = Number(ch.lessonPrice);
          }
        }
        amountRupees = unitPrice * targetModuleIds.length;
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
          chapterId: itemDetails.chapterId || '',
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
        paymentType: plan.type === 'subscription' ? 'subscription' : (plan.type === 'pay_per_chapter' || itemDetails.chapterId ? 'pay_per_chapter' : 'pay_per_lesson'),
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
    const { planCode, moduleId, moduleIds, chapterId } = req.body;
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

    let targetChapterId = chapterId || transaction?.itemDetails?.chapterId;
    if (!targetChapterId && moduleId && mongoose.isValidObjectId(moduleId)) {
      const mod = await Module.findById(moduleId).lean();
      if (mod?.chapterId) targetChapterId = String(mod.chapterId);
    }

    const isChapterPurchase = plan?.type === 'pay_per_chapter' || plan?.code === 'pay_per_chapter' || transaction?.paymentType === 'pay_per_chapter' || Boolean(targetChapterId);

    if (isSubscription) {
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
    } else if (isChapterPurchase && targetChapterId) {
      // 1-Year Chapter Pass
      const now = new Date();
      if (!userSub.purchasedChapters) userSub.purchasedChapters = [];
      const existingPurchase = userSub.purchasedChapters.find(c => String(c.chapterId) === String(targetChapterId));
      let expiresAt;
      if (existingPurchase && new Date(existingPurchase.expiresAt) > now) {
        expiresAt = new Date(new Date(existingPurchase.expiresAt).getTime() + 365 * 24 * 60 * 60 * 1000);
        existingPurchase.expiresAt = expiresAt;
        existingPurchase.amountPaid = (existingPurchase.amountPaid || 0) + (transaction?.amount || 50);
        existingPurchase.orderId = orderId;
      } else if (existingPurchase) {
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        existingPurchase.purchasedAt = now;
        existingPurchase.expiresAt = expiresAt;
        existingPurchase.amountPaid = transaction?.amount || 50;
        existingPurchase.orderId = orderId;
      } else {
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        userSub.purchasedChapters.push({
          chapterId: String(targetChapterId),
          purchasedAt: now,
          expiresAt,
          amountPaid: transaction?.amount || 50,
          orderId
        });
      }

      // Also unlock all modules in that chapter for backwards compatibility
      try {
        const chapterModules = await Module.find({ chapterId: targetChapterId }).select('_id').lean();
        for (const mod of chapterModules) {
          if (!userSub.purchasedModules.some(m => String(m.moduleId) === String(mod._id))) {
            userSub.purchasedModules.push({
              moduleId: String(mod._id),
              purchasedAt: now,
              amountPaid: 0,
              orderId
            });
            unlockedCount++;
          }
        }
      } catch (err) {
        console.warn('[Payment] Error unlocking modules for chapter:', err);
      }
    } else {
      // Pay-Per-Lesson purchase (supports single or multi-lesson)
      const targetModuleIds = (Array.isArray(moduleIds) && moduleIds.length > 0)
        ? moduleIds
        : (transaction?.itemDetails?.moduleIds?.length 
            ? transaction.itemDetails.moduleIds 
            : (moduleId || transaction?.itemDetails?.moduleId ? [moduleId || transaction.itemDetails.moduleId] : []));

      const unitPrice = transaction?.itemDetails?.unitPrice || plan?.amount || 50;

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
        : (isChapterPurchase 
            ? 'Chapter unlocked successfully for 1 full year! Exam Mode & all lessons are now active.'
            : (userSub ? `${unlockedCount > 1 ? `${unlockedCount} lessons` : 'Lesson'} unlocked successfully!` : 'Payment signature verified successfully')),
      transactionId: transaction?._id,
      paymentId,
      orderId,
      subscription: userSub ? {
        status: userSub.status,
        currentPeriodEnd: userSub.currentPeriodEnd,
        purchasedChapters: userSub.purchasedChapters,
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
    const { planCode, moduleId, moduleIds, chapterId } = req.body;
    const user = req.user;

    const config = await PaymentConfig.findOne({ singletonKey: 'default' });
    if (!config?.razorpay?.mockMode && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Mock sandbox mode is disabled' });
    }

    const plan = await SubscriptionPlan.findOne({ code: planCode, isActive: true }) ||
                 await SubscriptionPlan.findOne({ code: 'pay_per_chapter' }) ||
                 await SubscriptionPlan.findOne({ code: planCode });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const mockOrderId = `order_mock_${crypto.randomBytes(6).toString('hex')}`;
    const mockPaymentId = `pay_mock_${crypto.randomBytes(6).toString('hex')}`;

    let targetChapterId = chapterId;
    if (!targetChapterId && moduleId && mongoose.isValidObjectId(moduleId)) {
      const mod = await Module.findById(moduleId).lean();
      if (mod?.chapterId) targetChapterId = String(mod.chapterId);
    }

    const isChapterPurchase = plan.type === 'pay_per_chapter' || plan.code === 'pay_per_chapter' || Boolean(targetChapterId);

    const targetModuleIds = Array.isArray(moduleIds) && moduleIds.length > 0 
      ? moduleIds 
      : (moduleId ? [moduleId] : []);

    let itemDetails = {};
    let totalAmount = plan.amount || 50;

    if (isChapterPurchase && targetChapterId) {
      const ch = mongoose.isValidObjectId(targetChapterId) ? await Chapter.findById(targetChapterId).lean() : null;
      const unitPrice = ch?.chapterPrice ?? ch?.lessonPrice ?? plan.amount ?? config?.defaultChapterPrice ?? 50;
      totalAmount = unitPrice;
      itemDetails = {
        chapterId: String(targetChapterId),
        chapterTitle: ch?.title || `Chapter ${targetChapterId}`,
        validityDays: 365,
        unitPrice
      };
    } else if (plan.type === 'pay_per_lesson') {
      const unitPrice = plan.amount || 50;
      totalAmount = unitPrice * (targetModuleIds.length || 1);
      if (targetModuleIds.length > 0) {
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
      paymentType: plan.type === 'subscription' ? 'subscription' : (isChapterPurchase ? 'pay_per_chapter' : 'pay_per_lesson'),
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
    } else if (isChapterPurchase && targetChapterId) {
      const now = new Date();
      if (!userSub.purchasedChapters) userSub.purchasedChapters = [];
      const existingPurchase = userSub.purchasedChapters.find(c => String(c.chapterId) === String(targetChapterId));
      let expiresAt;
      if (existingPurchase && new Date(existingPurchase.expiresAt) > now) {
        expiresAt = new Date(new Date(existingPurchase.expiresAt).getTime() + 365 * 24 * 60 * 60 * 1000);
        existingPurchase.expiresAt = expiresAt;
        existingPurchase.amountPaid = (existingPurchase.amountPaid || 0) + totalAmount;
        existingPurchase.orderId = mockOrderId;
      } else if (existingPurchase) {
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        existingPurchase.purchasedAt = now;
        existingPurchase.expiresAt = expiresAt;
        existingPurchase.amountPaid = totalAmount;
        existingPurchase.orderId = mockOrderId;
      } else {
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        userSub.purchasedChapters.push({
          chapterId: String(targetChapterId),
          purchasedAt: now,
          expiresAt,
          amountPaid: totalAmount,
          orderId: mockOrderId
        });
      }

      // Also auto-unlock modules in that chapter for backwards compatibility
      try {
        const chapterModules = await Module.find({ chapterId: targetChapterId }).select('_id').lean();
        for (const mod of chapterModules) {
          if (!userSub.purchasedModules.some(m => String(m.moduleId) === String(mod._id))) {
            userSub.purchasedModules.push({
              moduleId: String(mod._id),
              purchasedAt: now,
              amountPaid: 0,
              orderId: mockOrderId
            });
          }
        }
      } catch (err) {
        console.warn('[Payment] Error unlocking modules for mock chapter:', err);
      }
    } else if (targetModuleIds.length > 0) {
      for (const mId of targetModuleIds) {
        const already = userSub.purchasedModules.some(m => String(m.moduleId) === String(mId));
        if (!already) {
          userSub.purchasedModules.push({
            moduleId: mId,
            purchasedAt: new Date(),
            amountPaid: plan.amount || 50,
            orderId: mockOrderId
          });
        }
      }
    }

    await userSub.save();

    res.json({
      success: true,
      message: isChapterPurchase 
        ? 'Chapter unlocked for 1 year in Sandbox Test!' 
        : 'Sandbox Mock Payment simulated successfully!',
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
