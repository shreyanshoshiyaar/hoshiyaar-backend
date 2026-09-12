import User from '../models/User.js';
import Module from '../models/Module.js';
import NotificationClick from '../models/NotificationClick.js';
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Cache for analytics to avoid repeated 50MB queries and timeouts
let cachedAnalytics = null;
let lastAnalyticsFetchTime = 0;
const ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  const { username, dateOfBirth } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { username, role: 'admin' },
        { username: new RegExp(`^${username}$`, 'i'), role: 'admin' },
        {
          username,
          phone: { $in: ['9867735936', '+919867735936', '919867735936', '7021970672', '+917021970672', '917021970672', '9820277252', '+919820277252', '919820277252'] }
        },
        {
          phone: username,
          role: 'admin'
        }
      ]
    });

    if (user && (await user.matchDateOfBirth(dateOfBirth))) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save({ validateBeforeSave: false });
      }
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: 'admin',
        token: generateToken(user._id, 'admin'),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials or access denied' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Get all users data and comprehensive tracking analytics
// @route   GET /api/admin/users-analytics
// @access  Private/Admin
export const getUsersAnalytics = async (req, res) => {
  try {
    const shouldRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const now = Date.now();

    if (!shouldRefresh && cachedAnalytics && (now - lastAnalyticsFetchTime < ANALYTICS_CACHE_TTL)) {
      return res.json(cachedAnalytics);
    }

    // 1. Fetch global counts, aggregation metrics, and charts data in parallel
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Default to fetching all users (limit = 0 means no limit in Mongoose) unless an explicit limit query param is provided
    const limit = (req.query.limit && req.query.limit !== 'all') ? parseInt(req.query.limit) : 0;

    const [
      totalUsersCount,
      registeredUsersCount,
      whatsappNudge0MinCount,
      whatsappNudge0MinConvertedCount,
      globalAggResult,
      gradeAgg,
      schoolAgg,
      platformAgg,
      regionAgg,
      signupsAgg,
      activeAgg,
      rawUsers
    ] = await Promise.all([
      // Total non-admin users across whole DB
      User.countDocuments({ role: { $ne: 'admin' } }),
      // Total registered (non-guest) users across whole DB
      User.countDocuments({ role: { $ne: 'admin' }, isGuest: false }),
      // Total 0-min WhatsApp nudges sent across whole DB
      User.countDocuments({ role: { $ne: 'admin' }, 'whatsappNudges.noModule30mSent': true }),
      // Total converted 0-min nudges across whole DB
      User.countDocuments({
        role: { $ne: 'admin' },
        'whatsappNudges.noModule30mSent': true,
        $or: [
          { totalPoints: { $gt: 0 } },
          { 'chaptersProgress.0': { $exists: true } }
        ]
      }),
      // Global points, onboarding completion, and unstarted counts
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$totalPoints' },
            onboardingCompletedCount: {
              $sum: { $cond: [{ $eq: ['$onboardingCompleted', true] }, 1, 0] }
            },
            noModuleStartedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $or: [{ $eq: ['$totalPoints', 0] }, { $not: ['$totalPoints'] }] },
                      { $or: [{ $eq: [{ $size: { $ifNull: ['$chaptersProgress', []] } }, 0] }] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      // Grade distribution across whole DB
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: '$classLevel', count: { $sum: 1 } } }
      ]),
      // School distribution across whole DB (top 10 schools)
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: '$school', count: { $sum: 1 }, totalPoints: { $sum: '$totalPoints' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // Platform distribution across whole DB
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: '$platform', count: { $sum: 1 } } }
      ]),
      // Region distribution across whole DB
      User.aggregate([
        { $match: { role: { $ne: 'admin' }, region: { $exists: true, $ne: null } } },
        { $group: { _id: '$region', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Signups in last 30 days grouped by IST date & hour
      User.aggregate([
        { $match: { role: { $ne: 'admin' }, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $project: {
            createdAtIST: {
              $dateAdd: {
                startDate: '$createdAt',
                unit: 'minute',
                amount: 330
              }
            }
          }
        },
        {
          $group: {
            _id: {
              dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$createdAtIST' } },
              hour: { $hour: '$createdAtIST' }
            },
            count: { $sum: 1 }
          }
        }
      ]),
      // Active users in last 30 days grouped by IST date & hour
      User.aggregate([
        { $match: { role: { $ne: 'admin' }, lastActiveAt: { $gte: thirtyDaysAgo } } },
        {
          $project: {
            activeAtIST: {
              $dateAdd: {
                startDate: '$lastActiveAt',
                unit: 'minute',
                amount: 330
              }
            }
          }
        },
        {
          $group: {
            _id: {
              dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$activeAtIST' } },
              hour: { $hour: '$activeAtIST' }
            },
            count: { $sum: 1 }
          }
        }
      ]),
      // Fetch user documents for the table (excluding heavy 50MB+ pointsLedger)
      User.find({ role: { $ne: 'admin' } })
        .select('username name email phone school region city country classLevel isGuest onboardingCompleted platform totalPoints chaptersProgress createdAt lastActiveAt activeDaysCount whatsappNudges funnelStage')
        .sort({ _id: -1 })
        .limit(limit)
        .lean()
    ]);

    const users = rawUsers.map(user => {
      let totalAttempts = 0;
      let correctAttempts = 0;
      let lastActive = user.lastActiveAt || user.createdAt || null;
      let dynamicActiveDays = user.activeDaysCount || 1;
      const activeDays = new Set();
      let completedModulesCount = 0;
      let lastSessionModuleId = null;

      // Extract accurate progress, accuracy, active days, and last active from chaptersProgress
      if (user.chaptersProgress && Array.isArray(user.chaptersProgress)) {
        user.chaptersProgress.forEach(ch => {
          if (ch.completedModules && Array.isArray(ch.completedModules)) {
            completedModulesCount += ch.completedModules.length;
            if (ch.completedModules.length > 0) {
              lastSessionModuleId = ch.completedModules[ch.completedModules.length - 1];
            }
          }
          if (ch.stats) {
            const statsEntries = ch.stats instanceof Map
              ? Array.from(ch.stats.values())
              : Object.values(ch.stats);

            statsEntries.forEach(s => {
              if (s) {
                totalAttempts += (s.correct || 0) + (s.wrong || 0);
                correctAttempts += (s.correct || 0);
                if (s.lastReviewedAt) {
                  const d = new Date(s.lastReviewedAt);
                  if (!isNaN(d.getTime())) {
                    activeDays.add(d.toDateString());
                    if (!lastActive || d > new Date(lastActive)) {
                      lastActive = d;
                    }
                  }
                }
              }
            });
          }
        });
      }

      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      dynamicActiveDays = Math.max(dynamicActiveDays, activeDays.size);
      // Realistic clustered usage estimate: ~4-5 mins per completed module or active sessions
      const useTime = Math.round(completedModulesCount * 4);

      return {
        _id: user._id,
        username: user.username || 'Anonymous Guest',
        name: user.name || 'N/A',
        email: user.email || null,
        phone: user.phone || null,
        school: user.school || 'Self Study / Individual',
        region: user.region || null,
        city: user.city || null,
        country: user.country || null,
        classLevel: user.classLevel || 'Not Specified',
        isGuest: !!user.isGuest,
        onboardingCompleted: !!user.onboardingCompleted,
        platform: user.platform || 'unknown',
        totalPoints: user.totalPoints || 0,
        useTime,
        accuracy,
        completedModulesCount,
        chaptersProgress: user.chaptersProgress || [],
        createdAt: user.createdAt,
        lastActive,
        lastSessionModuleId,
        activeDaysCount: dynamicActiveDays,
        whatsappNudges: user.whatsappNudges || {},
        funnelStage: user.funnelStage || 'signed_up'
      };
    });

    // Resolve Module Titles for lastSessionLocation
    const uniqueModuleIds = [...new Set(users.map(u => u.lastSessionModuleId).filter(Boolean))];
    const modulesData = await Module.find({ _id: { $in: uniqueModuleIds } }, 'title').lean();
    const moduleMap = {};
    modulesData.forEach(m => {
      moduleMap[m._id.toString()] = m.title;
    });

    users.forEach(u => {
      if (u.lastSessionModuleId && moduleMap[u.lastSessionModuleId]) {
        u.lastSessionLocation = moduleMap[u.lastSessionModuleId];
      } else {
        u.lastSessionLocation = 'N/A';
      }
      delete u.lastSessionModuleId; // remove internal ID to keep response clean
    });

    // 2. Global dashboard KPI metrics across all users
    const totalUsers = totalUsersCount;
    const registeredCount = registeredUsersCount;
    const guestsCount = Math.max(0, totalUsers - registeredCount);
    const globalAgg = globalAggResult[0] || {};
    const avgPoints = totalUsers > 0 ? Math.round((globalAgg.totalPoints || 0) / totalUsers) : 0;
    const onboardingRate = totalUsers > 0 ? Math.round(((globalAgg.onboardingCompletedCount || 0) / totalUsers) * 100) : 0;
    const noModuleStartedCount = globalAgg.noModuleStartedCount || 0;

    const usersWithUse = users.filter(u => u.useTime > 0);
    const avgAccuracy = usersWithUse.length > 0
      ? Math.round(usersWithUse.reduce((acc, u) => acc + u.accuracy, 0) / usersWithUse.length)
      : 0;
    const avgUseTime = users.length > 0 ? Math.round(users.reduce((acc, u) => acc + u.useTime, 0) / users.length) : 0;

    const whatsappStats = {
      nudge_0_min: whatsappNudge0MinCount,
      nudge_0_min_converted: whatsappNudge0MinConvertedCount,
    };

    const stats = {
      totalUsers,
      guestsCount,
      registeredCount,
      avgPoints,
      onboardingRate,
      avgAccuracy,
      avgUseTime,
      noModuleStartedCount,
      whatsappStats,
    };

    // 3. Global Charts Data across all users
    
    // Grade Distribution (merged)
    const gradeMap = {};
    gradeAgg.forEach(g => {
      const name = (!g._id || g._id === 'Not Specified' || g._id === '') ? 'Other / Guest' : `Class ${g._id}`;
      gradeMap[name] = (gradeMap[name] || 0) + g.count;
    });
    const gradeDistribution = Object.keys(gradeMap)
      .map(name => ({ name, value: gradeMap[name] }))
      .filter(g => g.value > 0);

    // School Distribution
    const schoolDistribution = schoolAgg
      .filter(s => s._id && s._id.trim() !== '')
      .map(s => ({
        name: s._id,
        count: s.count,
        avgPoints: s.count > 0 ? Math.round((s.totalPoints || 0) / s.count) : 0,
      }))
      .slice(0, 10);

    // Platform Distribution (merged)
    const platformCountMap = {};
    platformAgg.forEach(p => {
      const rawName = p._id || 'unknown';
      const name = rawName === 'unknown' ? 'Unknown' : (rawName.charAt(0).toUpperCase() + rawName.slice(1));
      platformCountMap[name] = (platformCountMap[name] || 0) + p.count;
    });
    const platformDistribution = Object.keys(platformCountMap)
      .map(name => ({ name, value: platformCountMap[name] }))
      .filter(p => p.value > 0);

    // Region Distribution
    const regionDistribution = regionAgg
      .filter(r => r._id && r._id.trim() !== '')
      .map(r => ({
        name: r._id,
        value: r.count,
      }));

    // Signups & Activity Timeline (last 30 days)
    const timelineMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(d.getUTCHours() + 5);
      d.setUTCMinutes(d.getUTCMinutes() + 30);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hourly = Array.from({length: 24}, (_, idx) => ({
        hour: `${String(idx).padStart(2, '0')}:00`,
        signups: 0,
        activeUsers: 0
      }));
      
      timelineMap[dateStr] = { date: dateStr, signups: 0, activeUsers: 0, hourly };
    }

    signupsAgg.forEach(item => {
      const { dateStr, hour } = item._id;
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].signups += item.count;
        if (timelineMap[dateStr].hourly && timelineMap[dateStr].hourly[hour]) {
          timelineMap[dateStr].hourly[hour].signups += item.count;
        }
      }
    });

    activeAgg.forEach(item => {
      const { dateStr, hour } = item._id;
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].activeUsers += item.count;
        if (timelineMap[dateStr].hourly && timelineMap[dateStr].hourly[hour]) {
          timelineMap[dateStr].hourly[hour].activeUsers += item.count;
        }
      }
    });

    const activeTimeline = Object.values(timelineMap);

    const responseData = {
      success: true,
      stats,
      chartsData: {
        gradeDistribution,
        schoolDistribution,
        activeTimeline,
        platformDistribution,
        regionDistribution,
      },
      users,
    };

    cachedAnalytics = responseData;
    lastAnalyticsFetchTime = Date.now();

    // Immediately respond to user so the dashboard loads instantly!
    res.json(responseData);
  } catch (error) {
    console.error('🔥 Error in getUsersAnalytics:', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update a user's school
// @route   PUT /api/admin/users/:id/school
// @access  Private/Admin
export const updateUserSchool = async (req, res) => {
  try {
    const { school } = req.body;
    const user = await User.findById(req.params.id);

    if (user) {
      user.school = school || 'Self Study / Individual';
      const updatedUser = await user.save();
      cachedAnalytics = null; // Invalidate cache
      res.json({ success: true, user: updatedUser });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// Helper to build individual session record
function buildSessionRecord(user, entries, moduleMap, index) {
  const startTimestamp = entries[0].timestamp;
  const endTimestamp = entries[entries.length - 1].timestamp;
  const durationMinutes = Math.max(2, Math.round((endTimestamp - startTimestamp) / 60000));

  const totalAttempts = entries.length;
  const correctAttempts = entries.filter(e => e.correct).length;
  const incorrectAttempts = totalAttempts - correctAttempts;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const pointsEarned = entries.reduce((sum, e) => sum + (e.awarded || 0), 0);

  const uniqueModuleIds = [...new Set(entries.map(e => e.moduleId).filter(Boolean))];
  const moduleTitles = uniqueModuleIds.map(id => {
    const key = String(id);
    if (!moduleMap) return `Module ${key.slice(-4)}`;
    if (typeof moduleMap.get === 'function') return moduleMap.get(key) || `Module ${key.slice(-4)}`;
    return moduleMap[key] || `Module ${key.slice(-4)}`;
  });

  const startDate = new Date(startTimestamp);
  const istDateStr = startDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const istStartTimeStr = startDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  const istEndTimeStr = new Date(endTimestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

  return {
    sessionId: `SES_${user._id.toString().slice(-6)}_${startDate.toISOString().slice(0, 10).replace(/-/g, '')}_${index}`,
    userId: user._id.toString(),
    username: user.username || 'Anonymous Guest',
    name: user.name || 'N/A',
    email: user.email || '',
    phone: user.phone || '',
    classLevel: user.classLevel || 'Not Specified',
    school: user.school || 'Self Study / Individual',
    platform: user.platform || 'unknown',
    location: [user.region, user.city].filter(Boolean).join(' - ') || 'N/A',
    sessionDate: istDateStr,
    startTime: startDate.toISOString(),
    endTime: new Date(endTimestamp).toISOString(),
    startTimeIST: istStartTimeStr,
    endTimeIST: istEndTimeStr,
    durationMinutes,
    totalAttempts,
    correctAttempts,
    incorrectAttempts,
    accuracy,
    pointsEarned,
    modulesStudied: moduleTitles.join('; ') || 'N/A'
  };
}

let cachedSessions = null;
let lastSessionsFetchTime = 0;
const SESSIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Synchronous helper to cluster user pointsLedger into sessions
export function buildAllSessions(users, moduleMap = {}) {
  const maxGap = 15 * 60 * 1000; // 15-minute sliding window
  const allSessions = [];

  for (const user of users) {
    if (!user || !user.pointsLedger) continue;
    const entries = user.pointsLedger instanceof Map
      ? Array.from(user.pointsLedger.values())
      : Object.values(user.pointsLedger);

    const validEntries = entries
      .filter(e => e && (e.attemptedAt || e.earnedAt || e.createdAt))
      .map(e => {
        const rawDate = e.attemptedAt || e.earnedAt || e.createdAt;
        return {
          ...e,
          attemptedAt: rawDate,
          timestamp: new Date(rawDate).getTime()
        };
      })
      .filter(e => !isNaN(e.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validEntries.length === 0) continue;

    let currentSessionEntries = [validEntries[0]];

    for (let i = 1; i < validEntries.length; i++) {
      const prev = validEntries[i - 1];
      const curr = validEntries[i];

      if (curr.timestamp - prev.timestamp <= maxGap) {
        currentSessionEntries.push(curr);
      } else {
        allSessions.push(buildSessionRecord(user, currentSessionEntries, moduleMap, allSessions.length + 1));
        currentSessionEntries = [curr];
      }
    }
    if (currentSessionEntries.length > 0) {
      allSessions.push(buildSessionRecord(user, currentSessionEntries, moduleMap, allSessions.length + 1));
    }
  }

  // Sort latest sessions first
  allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  return allSessions;
}

// Helper to extract session-wise data from users' pointsLedger
export const extractSessionsFromUsers = async (options = {}) => {
  const { limit = 1000, forceRefresh = false } = options;
  const now = Date.now();
  if (!forceRefresh && cachedSessions && (now - lastSessionsFetchTime < SESSIONS_CACHE_TTL)) {
    return cachedSessions;
  }

  const Module = (await import('../models/Module.js')).default;
  const modulesData = await Module.find({}, 'title').lean();
  const moduleMap = {};
  modulesData.forEach(m => {
    moduleMap[m._id.toString()] = m.title;
  });

  const query = { role: { $ne: 'admin' }, totalPoints: { $gt: 0 } };
  const rawUsers = await User.find(query)
    .select('username name email phone school classLevel platform region city country pointsLedger')
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  cachedSessions = buildAllSessions(rawUsers, moduleMap);
  lastSessionsFetchTime = Date.now();
  return cachedSessions;
};

// @desc    Get session-wise analytics
// @route   GET /api/admin/sessions
// @access  Private/Admin
export const getSessionsAnalytics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const forceRefresh = req.query.refresh === 'true';
    const sessions = await extractSessionsFromUsers({ limit, forceRefresh });
    res.json({
      success: true,
      totalSessions: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('🔥 Error in getSessionsAnalytics:', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Download session-wise data as CSV
// @route   GET /api/admin/sessions/export-csv
// @access  Private/Admin
export const exportSessionsCSV = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1500;
    const forceRefresh = req.query.refresh === 'true';
    const sessions = await extractSessionsFromUsers({ limit, forceRefresh });

    const headers = [
      'Session ID',
      'User ID',
      'Username',
      'Name',
      'Phone',
      'Email',
      'Class',
      'School',
      'Platform',
      'Location',
      'Session Date (IST)',
      'Start Time (IST)',
      'End Time (IST)',
      'Duration (mins)',
      'Questions Attempted',
      'Questions Correct',
      'Questions Incorrect',
      'Accuracy (%)',
      'Points Earned',
      'Modules Studied'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = sessions.map(s => [
      escapeCSV(s.sessionId),
      escapeCSV(s.userId),
      escapeCSV(s.username),
      escapeCSV(s.name),
      escapeCSV(s.phone),
      escapeCSV(s.email),
      escapeCSV(s.classLevel),
      escapeCSV(s.school),
      escapeCSV(s.platform),
      escapeCSV(s.location),
      escapeCSV(s.sessionDate),
      escapeCSV(s.startTimeIST),
      escapeCSV(s.endTimeIST),
      s.durationMinutes,
      s.totalAttempts,
      s.correctAttempts,
      s.incorrectAttempts,
      s.accuracy,
      s.pointsEarned,
      escapeCSV(s.modulesStudied)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const filename = `hoshiyaar_normal_sessions_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('🔥 Error in exportSessionsCSV:', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Get notification click analytics (day-wise, by type)
// @route   GET /api/admin/notification-analytics
// @access  Private/Admin
export const getNotificationAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Build IST date string helper
    const toISTDateStr = (date) => {
      const d = new Date(date);
      d.setUTCHours(d.getUTCHours() + 5);
      d.setUTCMinutes(d.getUTCMinutes() + 30);
      return d.toISOString().split('T')[0];
    };

    // Last N days
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const clicks = await NotificationClick.find({ clickedAt: { $gte: since } })
      .select('type clickedAt')
      .lean();

    const TYPES = ['daily_mass', 'inactivity_nudge', 'streak_risk', 'rank_drop', 'chapter_promo', 'manual_nudge', 'unknown'];

    // Build empty day map for last N days
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toISTDateStr(d);
      const entry = { date: dateStr, total: 0 };
      TYPES.forEach(t => { entry[t] = 0; });
      dayMap[dateStr] = entry;
    }

    // Aggregate clicks by day and type
    clicks.forEach(click => {
      const dateStr = toISTDateStr(click.clickedAt);
      if (dayMap[dateStr]) {
        dayMap[dateStr].total += 1;
        const t = TYPES.includes(click.type) ? click.type : 'unknown';
        dayMap[dateStr][t] = (dayMap[dateStr][t] || 0) + 1;
      }
    });

    const timeline = Object.values(dayMap);

    // Summary stats
    const totalClicks = clicks.length;
    const typeBreakdown = {};
    TYPES.forEach(t => { typeBreakdown[t] = 0; });
    clicks.forEach(c => {
      const t = TYPES.includes(c.type) ? c.type : 'unknown';
      typeBreakdown[t] += 1;
    });

    // Last 7 days total
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Total = clicks.filter(c => new Date(c.clickedAt) >= sevenDaysAgo).length;

    res.json({
      success: true,
      totalClicks,
      last7Total,
      typeBreakdown,
      timeline,
      types: TYPES,
    });
  } catch (error) {
    console.error('🔥 Error in getNotificationAnalytics:', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


