import User from '../models/User.js';
import Module from '../models/Module.js';
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  const { username, dateOfBirth } = req.body;

  try {
    const user = await User.findOne({ username, role: 'admin' });

    if (user && (await user.matchDateOfBirth(dateOfBirth))) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        token: generateToken(user._id, user.role),
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
    // Only fetch non-admin users for actual student usage tracking, and only project needed fields
    const rawUsers = await User.find({ role: { $ne: 'admin' } })
      .select('username name email phone school region city country classLevel isGuest onboardingCompleted platform totalPoints chaptersProgress createdAt lastActiveAt activeDaysCount whatsappNudges pointsLedger')
      .lean();

    const users = rawUsers.map(user => {
      // 1. Process points ledger to calculate clustered active usage duration and accuracy
      const ledgerEntries = user.pointsLedger
        ? (user.pointsLedger instanceof Map
            ? Array.from(user.pointsLedger.values())
            : Object.values(user.pointsLedger))
        : [];

      // Calculate accuracy
      const totalAttempts = ledgerEntries.length;
      const correctAttempts = ledgerEntries.filter(entry => entry.correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Calculate Clustered Active Minutes
      const timestamps = ledgerEntries
        .map(entry => entry.attemptedAt ? new Date(entry.attemptedAt).getTime() : null)
        .filter(t => t !== null)
        .sort((a, b) => a - b);

      let useTime = 0;
      // Fallback: If they have a true lastActiveAt field, use it. Otherwise createdAt. Never use updatedAt because cron jobs modify it!
      let lastActive = user.lastActiveAt || user.createdAt || new Date();
      let lastSessionModuleId = null;
      let dynamicActiveDays = user.activeDaysCount || 1;

      if (timestamps.length > 0) {
        lastActive = new Date(timestamps[timestamps.length - 1]);
        
        // Calculate accurate active days from actual quiz attempts
        const uniqueDays = new Set(timestamps.map(t => new Date(t).toDateString()));
        dynamicActiveDays = Math.max(dynamicActiveDays, uniqueDays.size);
        
        // Find last session moduleId by looking at the chronologically last valid entry
        const sortedEntries = ledgerEntries
          .filter(e => e.attemptedAt)
          .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
        if (sortedEntries.length > 0) {
          lastSessionModuleId = sortedEntries[sortedEntries.length - 1].moduleId;
        }

        let sessionStart = timestamps[0];
        let sessionEnd = timestamps[0];
        const maxGap = 15 * 60 * 1000; // 15-minute sliding window

        for (let i = 1; i < timestamps.length; i++) {
          const t = timestamps[i];
          if (t - sessionEnd <= maxGap) {
            sessionEnd = t;
          } else {
            // Conclude previous session (minimum 2 minutes)
            useTime += Math.max(2, (sessionEnd - sessionStart) / 60000);
            sessionStart = t;
            sessionEnd = t;
          }
        }
        // Conclude final session
        useTime += Math.max(2, (sessionEnd - sessionStart) / 60000);
      }

      useTime = Math.round(useTime);

      // 2. Calculate completed modules across all chapters
      let completedModulesCount = 0;
      if (user.chaptersProgress && Array.isArray(user.chaptersProgress)) {
        user.chaptersProgress.forEach(ch => {
          if (ch.completedModules && Array.isArray(ch.completedModules)) {
            completedModulesCount += ch.completedModules.length;
          }
        });
      }

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
        _allTimestamps: timestamps // Kept for DAU aggregation
      };
    });

    // 2.5 Resolve Module Titles for lastSessionLocation
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

    // 3. Aggregate top-level dashboard metrics
    const totalUsers = users.length;
    const guestsCount = users.filter(u => u.isGuest).length;
    const registeredCount = users.filter(u => !u.isGuest).length;
    const avgPoints = totalUsers > 0 ? Math.round(users.reduce((acc, u) => acc + u.totalPoints, 0) / totalUsers) : 0;
    const onboardingRate = totalUsers > 0 ? Math.round((users.filter(u => u.onboardingCompleted).length / totalUsers) * 100) : 0;

    const usersWithUse = users.filter(u => u.useTime > 0);
    const avgAccuracy = usersWithUse.length > 0
      ? Math.round(usersWithUse.reduce((acc, u) => acc + u.accuracy, 0) / usersWithUse.length)
      : 0;
    
    const avgUseTime = totalUsers > 0 ? Math.round(users.reduce((acc, u) => acc + u.useTime, 0) / totalUsers) : 0;

    // WhatsApp Nudges Aggregation
    let whatsappStats = {
      nudge_0_min: 0,
      nudge_0_min_converted: 0,
      nudge_mission_incomplete: 0,
      nudge_streak_break: 0,
      nudge_3_days_inactive: 0,
    };

    users.forEach(u => {
      if (u.whatsappNudges) {
        if (u.whatsappNudges.noModule30mSent) {
          whatsappStats.nudge_0_min++;
          if (u.chaptersProgress && u.chaptersProgress.length > 0) {
            whatsappStats.nudge_0_min_converted++;
          }
        }
        if (u.whatsappNudges.startedNotCompleted2hSent) whatsappStats.nudge_mission_incomplete++;
        if (u.whatsappNudges.inactive24hSent) whatsappStats.nudge_streak_break++;
        if (u.whatsappNudges.inactive3DaysSent) whatsappStats.nudge_3_days_inactive++;
      }
    });

    const stats = {
      totalUsers,
      guestsCount,
      registeredCount,
      avgPoints,
      onboardingRate,
      avgAccuracy,
      avgUseTime,
      whatsappStats,
    };

    // 4. Group data for Charts (Grade level, School and Timelines)
    
    // Grade Distribution
    const gradeMap = {};
    users.forEach(u => {
      const grade = u.classLevel;
      gradeMap[grade] = (gradeMap[grade] || 0) + 1;
    });
    const gradeDistribution = Object.keys(gradeMap).map(grade => ({
      name: grade === 'Not Specified' ? 'Other / Guest' : `Class ${grade}`,
      value: gradeMap[grade],
    }));

    // School Distribution
    const schoolMap = {};
    users.forEach(u => {
      const sch = u.school;
      if (!schoolMap[sch]) {
        schoolMap[sch] = { name: sch, students: 0, totalPoints: 0 };
      }
      schoolMap[sch].students += 1;
      schoolMap[sch].totalPoints += u.totalPoints;
    });
    const schoolDistribution = Object.values(schoolMap)
      .map(s => ({
        name: s.name,
        count: s.students,
        avgPoints: Math.round(s.totalPoints / s.students),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 schools

    // Helper for IST time
    const getISTDateHour = (dateInput) => {
      const d = new Date(dateInput);
      d.setUTCHours(d.getUTCHours() + 5);
      d.setUTCMinutes(d.getUTCMinutes() + 30);
      return {
        dateStr: d.toISOString().split('T')[0],
        hour: d.getUTCHours()
      };
    };

    // Signups & Activity Timeline (last 30 days)
    const timelineMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(d.getUTCHours() + 5);
      d.setUTCMinutes(d.getUTCMinutes() + 30);
      // d.getUTCDate() works properly after adding hours
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hourly = Array.from({length: 24}, (_, idx) => ({
        hour: `${String(idx).padStart(2, '0')}:00`,
        signups: 0,
        activeUsers: 0
      }));
      
      timelineMap[dateStr] = { date: dateStr, signups: 0, activeUsers: 0, hourly };
    }

    users.forEach(u => {
      // 1. Plot signups
      if (u.createdAt) {
        const { dateStr, hour } = getISTDateHour(u.createdAt);
        if (timelineMap[dateStr]) {
          timelineMap[dateStr].signups += 1;
          timelineMap[dateStr].hourly[hour].signups += 1;
        }
      }

      // 2. Plot True DAU (Daily Active Users)
      if (u._allTimestamps && u._allTimestamps.length > 0) {
        const activeDaysForUser = new Set();
        const activeHoursForUser = new Set();
        
        u._allTimestamps.forEach(t => {
          const { dateStr, hour } = getISTDateHour(t);
          activeDaysForUser.add(dateStr);
          activeHoursForUser.add(`${dateStr}|${hour}`);
        });

        // Add this user to the total DAU count for those specific days
        activeDaysForUser.forEach(dateStr => {
          if (timelineMap[dateStr]) {
            timelineMap[dateStr].activeUsers += 1;
          }
        });
        
        // Add this user to the hourly breakdown
        activeHoursForUser.forEach(entry => {
          const [dateStr, hourStr] = entry.split('|');
          const hr = parseInt(hourStr, 10);
          if (timelineMap[dateStr] && timelineMap[dateStr].hourly[hr]) {
            timelineMap[dateStr].hourly[hr].activeUsers += 1;
          }
        });
        
        delete u._allTimestamps;
      } else if (u.lastActive) {
        // Fallback for users with no pointsLedger activity (e.g. 0-min users or pure scrollers)
        const { dateStr, hour } = getISTDateHour(u.lastActive);
        if (timelineMap[dateStr]) {
          timelineMap[dateStr].activeUsers += 1;
          if (timelineMap[dateStr].hourly[hour]) {
            timelineMap[dateStr].hourly[hour].activeUsers += 1;
          }
        }
      }
    });

    const activeTimeline = Object.values(timelineMap);

    // Platform Distribution
    const platformMap = { web: 0, android: 0, ios: 0, unknown: 0 };
    users.forEach(u => {
      const p = u.platform || 'unknown';
      if (platformMap[p] !== undefined) platformMap[p]++;
    });
    const platformDistribution = Object.keys(platformMap)
      .filter(k => platformMap[k] > 0)
      .map(k => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: platformMap[k]
      }));

    // Region Distribution
    const regionMap = {};
    users.forEach(u => {
      if (u.region) {
        regionMap[u.region] = (regionMap[u.region] || 0) + 1;
      }
    });
    const regionDistribution = Object.keys(regionMap)
      .map(region => ({
        name: region,
        value: regionMap[region],
      }))
      .sort((a, b) => b.value - a.value);

    res.json({
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
    });
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
      res.json({ success: true, user: updatedUser });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
