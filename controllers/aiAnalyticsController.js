import mongoose from 'mongoose';
import AiExamSession from '../models/AiExamSession.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';

// Helper to get start of current week (Monday 00:00:00.000 UTC / local)
export const getWeekMonday = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Helper to get next Monday 00:00:00.000
export const getNextMonday = (d = new Date()) => {
  const monday = getWeekMonday(d);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return nextMonday;
};

// Default fallback config
export const DEFAULT_EXAM_CONFIG = {
  maxChaptersPerWeek: 3,
  maxAttemptsPerChapterPerWeek: 3,
  exhaustedMessage: "You have reached your weekly limit for Exam Mode. Your attempts will reset on Monday!",
  chapterExhaustedMessage: "You have used all 3 attempts for this chapter this week. You can practice other chapters or try again next Monday!",
  enabled: true
};

// Get current attempt limits & status for a user & chapter
export const getExamLimits = async (req, res) => {
  try {
    const { userId, chapterId } = req.query;
    
    // Fetch dynamic setting from backend
    let setting = await SystemSettings.findOne({ key: 'exam_attempt_config' });
    const config = setting?.value || DEFAULT_EXAM_CONFIG;

    const maxChapters = Number(config.maxChaptersPerWeek || 3);
    const maxAttemptsPerChapter = Number(config.maxAttemptsPerChapterPerWeek || 3);
    const nextReset = getNextMonday();

    // If config disabled or no user specified, allow
    if (!config.enabled || !userId) {
      return res.json({
        allowed: true,
        maxChaptersPerWeek: maxChapters,
        chaptersAttemptedCount: 0,
        chaptersRemaining: maxChapters,
        maxAttemptsPerChapter: maxAttemptsPerChapter,
        chapterAttemptsUsed: 0,
        chapterAttemptsRemaining: maxAttemptsPerChapter,
        exhausted: false,
        exhaustedMessage: '',
        attemptsLeftMessage: `${maxAttemptsPerChapter} of ${maxAttemptsPerChapter} attempts remaining`,
        nextResetDate: nextReset,
        config
      });
    }

    // Check if user is admin (admins get unlimited attempts)
    const user = await User.findById(userId).select('role phone username');
    const cleanPhone = String(user?.phone || '').replace(/\D/g, '');
    const isAdmin = user?.role === 'admin' ||
      ['9867735936', '7021970672', '9820277252'].some(p => cleanPhone.endsWith(p)) ||
      ['Host', 'hostcbse', 'AKSHITRAVULA', 'AKSHIT', 'SB10', 'Nidhi sekhri'].includes(user?.username);

    if (isAdmin) {
      return res.json({
        allowed: true,
        isAdmin: true,
        maxChaptersPerWeek: maxChapters,
        chaptersAttemptedCount: 0,
        chaptersRemaining: maxChapters,
        maxAttemptsPerChapter: maxAttemptsPerChapter,
        chapterAttemptsUsed: 0,
        chapterAttemptsRemaining: maxAttemptsPerChapter,
        exhausted: false,
        exhaustedMessage: '',
        attemptsLeftMessage: 'Admin Access: Unlimited Attempts',
        nextResetDate: nextReset,
        config
      });
    }

    const currentWeekStart = getWeekMonday();

    // Query all sessions for this user in the current week
    const weekSessions = await AiExamSession.find({
      userId,
      weekStart: currentWeekStart,
      status: 'completed'
    }).select('chapterId attemptNumber');

    // Get unique chapters attempted this week
    const distinctChapters = Array.from(new Set(weekSessions.map(s => String(s.chapterId))));
    const chaptersCount = distinctChapters.length;
    const chaptersRemaining = Math.max(0, maxChapters - chaptersCount);

    // Calculate attempts for requested chapter
    let chapterAttemptsUsed = 0;
    if (chapterId) {
      chapterAttemptsUsed = weekSessions.filter(s => String(s.chapterId) === String(chapterId)).length;
    }
    const chapterAttemptsRemaining = Math.max(0, maxAttemptsPerChapter - chapterAttemptsUsed);

    // Check limits
    let allowed = true;
    let exhausted = false;
    let exhaustedMessage = '';

    const isNewChapter = chapterId && !distinctChapters.includes(String(chapterId));

    if (isNewChapter && chaptersCount >= maxChapters) {
      allowed = false;
      exhausted = true;
      exhaustedMessage = config.exhaustedMessage || DEFAULT_EXAM_CONFIG.exhaustedMessage;
    } else if (chapterId && chapterAttemptsUsed >= maxAttemptsPerChapter) {
      allowed = false;
      exhausted = true;
      exhaustedMessage = config.chapterExhaustedMessage || DEFAULT_EXAM_CONFIG.chapterExhaustedMessage;
    }

    const attemptsLeftMessage = chapterAttemptsRemaining === 1 
      ? `1 attempt left for this chapter this week`
      : `${chapterAttemptsRemaining} of ${maxAttemptsPerChapter} attempts remaining for this chapter`;

    return res.json({
      allowed,
      maxChaptersPerWeek: maxChapters,
      chaptersAttemptedCount: chaptersCount,
      chaptersRemaining,
      maxAttemptsPerChapter,
      chapterAttemptsUsed,
      chapterAttemptsRemaining,
      exhausted,
      exhaustedMessage,
      attemptsLeftMessage,
      nextResetDate: nextReset,
      config
    });

  } catch (error) {
    console.error('Error fetching exam limits:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin Analytics: Get overall and session-wise AI statistics
export const getAiAnalytics = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = getWeekMonday();

    // Aggregate totals
    const [
      overallStats,
      todayStats,
      weekStats,
      chapterStats,
      recentSessions,
      totalSessionsCount
    ] = await Promise.all([
      // Overall totals
      AiExamSession.aggregate([
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalCredits: { $sum: "$aiCreditsUsed" },
            totalTokens: { $sum: "$totalTokens" },
            avgScore: { $avg: "$finalScore" },
            uniqueUsers: { $addToSet: "$userId" }
          }
        }
      ]),

      // Today totals
      AiExamSession.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            todaySessions: { $sum: 1 },
            todayCredits: { $sum: "$aiCreditsUsed" },
            todayTokens: { $sum: "$totalTokens" }
          }
        }
      ]),

      // This Week totals
      AiExamSession.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: null,
            weekSessions: { $sum: 1 },
            weekCredits: { $sum: "$aiCreditsUsed" },
            weekTokens: { $sum: "$totalTokens" }
          }
        }
      ]),

      // Chapter-wise performance
      AiExamSession.aggregate([
        {
          $group: {
            _id: "$chapterId",
            chapterTitle: { $first: "$chapterTitle" },
            subject: { $first: "$subject" },
            totalAttempts: { $sum: 1 },
            avgScore: { $avg: "$finalScore" },
            avgTimeSpent: { $avg: "$timeSpentSeconds" },
            totalCredits: { $sum: "$aiCreditsUsed" }
          }
        },
        { $sort: { totalAttempts: -1 } },
        { $limit: 15 }
      ]),

      // Recent session logs with user details
      AiExamSession.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username phone school classLevel')
        .lean(),

      AiExamSession.countDocuments()
    ]);

    const stats = overallStats[0] || {
      totalSessions: 0,
      totalCredits: 0,
      totalTokens: 0,
      avgScore: 0,
      uniqueUsers: []
    };

    const today = todayStats[0] || { todaySessions: 0, todayCredits: 0, todayTokens: 0 };
    const week = weekStats[0] || { weekSessions: 0, weekCredits: 0, weekTokens: 0 };

    // Fetch current attempt config
    const setting = await SystemSettings.findOne({ key: 'exam_attempt_config' });

    res.json({
      summary: {
        totalSessions: stats.totalSessions || 0,
        totalCredits: stats.totalCredits || 0,
        totalTokens: stats.totalTokens || 0,
        avgScore: Math.round(stats.avgScore || 0),
        totalUniqueUsers: stats.uniqueUsers ? stats.uniqueUsers.length : 0,
        todaySessions: today.todaySessions || 0,
        todayCredits: today.todayCredits || 0,
        todayTokens: today.todayTokens || 0,
        weekSessions: week.weekSessions || 0,
        weekCredits: week.weekCredits || 0,
        weekTokens: week.weekTokens || 0
      },
      config: setting?.value || DEFAULT_EXAM_CONFIG,
      chapterBreakdown: chapterStats,
      sessions: recentSessions,
      pagination: {
        page,
        limit,
        total: totalSessionsCount,
        totalPages: Math.ceil(totalSessionsCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update exam attempt config
export const updateExamAttemptConfig = async (req, res) => {
  try {
    const { maxChaptersPerWeek, maxAttemptsPerChapterPerWeek, exhaustedMessage, chapterExhaustedMessage, enabled } = req.body;

    const newConfig = {
      maxChaptersPerWeek: Number(maxChaptersPerWeek) || 3,
      maxAttemptsPerChapterPerWeek: Number(maxAttemptsPerChapterPerWeek) || 3,
      exhaustedMessage: exhaustedMessage || DEFAULT_EXAM_CONFIG.exhaustedMessage,
      chapterExhaustedMessage: chapterExhaustedMessage || DEFAULT_EXAM_CONFIG.chapterExhaustedMessage,
      enabled: enabled !== undefined ? Boolean(enabled) : true
    };

    const setting = await SystemSettings.findOneAndUpdate(
      { key: 'exam_attempt_config' },
      { value: newConfig, description: 'Weekly attempt limits and messages for Exam Mode' },
      { new: true, upsert: true }
    );

    res.json({ success: true, config: setting.value });
  } catch (error) {
    console.error('Error updating exam attempt config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Student: Get latest completed exam session for a chapter
export const getLatestExamSession = async (req, res) => {
  try {
    const { userId, chapterId } = req.query;
    if (!userId || !chapterId) {
      return res.status(400).json({ error: 'userId and chapterId are required.' });
    }

    const query = {
      chapterId: String(chapterId),
      status: 'completed'
    };

    if (mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    }

    const session = await AiExamSession.findOne(query).sort({ createdAt: -1 });
    return res.json({ session: session || null });
  } catch (error) {
    console.error('Error fetching latest exam session:', error);
    res.status(500).json({ error: error.message });
  }
};

// Student: Get user exam session history across chapters
export const getUserExamHistory = async (req, res) => {
  try {
    const { userId, chapterId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const query = { status: 'completed' };
    if (mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    }
    if (chapterId) {
      query.chapterId = String(chapterId);
    }

    const sessions = await AiExamSession.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .select('-__v');

    return res.json({ sessions });
  } catch (error) {
    console.error('Error fetching user exam history:', error);
    res.status(500).json({ error: error.message });
  }
};

// Student: Directly save or sync completed exam session to database
export const saveExamSession = async (req, res) => {
  try {
    const {
      userId,
      chapterId,
      chapterTitle,
      subject,
      finalScore,
      timeSpentSeconds = 0,
      questions = []
    } = req.body;

    if (!chapterId) {
      return res.status(400).json({ error: 'chapterId is required.' });
    }

    let userInfo = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const u = await User.findById(userId).select('name username phone school');
      if (u) {
        userInfo = {
          name: u.name || '',
          username: u.username || '',
          phone: u.phone || '',
          school: u.school || ''
        };
      }
    }

    const currentWeekStart = getWeekMonday();
    let attemptNumber = 1;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const prevCount = await AiExamSession.countDocuments({
        userId,
        chapterId: String(chapterId),
        weekStart: currentWeekStart
      });
      attemptNumber = prevCount + 1;
    }

    const session = await AiExamSession.create({
      userId: (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null,
      userInfo,
      chapterId: String(chapterId),
      chapterTitle: chapterTitle || '',
      subject: subject || 'Science',
      weekStart: currentWeekStart,
      attemptNumber,
      questions,
      finalScore: Number(finalScore !== undefined ? finalScore : 0),
      timeSpentSeconds: Number(timeSpentSeconds || 0),
      aiCreditsUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      status: 'completed'
    });

    return res.json({ success: true, session });
  } catch (error) {
    console.error('Error saving exam session to database:', error);
    res.status(500).json({ error: error.message });
  }
};

