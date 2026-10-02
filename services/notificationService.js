import admin from 'firebase-admin';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import ClassLevel from '../models/ClassLevel.js';
import Classroom from '../models/Classroom.js';
import Assignment from '../models/Assignment.js';
import cron from 'node-cron';
import { getCurrentMondayIST } from '../controllers/authController.js';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Firebase Admin
export const initFirebase = () => {
  if (admin.apps && admin.apps.length > 0) {
    return admin.app();
  }
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      // Decode from base64 (useful for Railway deployment)
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
      console.log('✅ Loaded Firebase credentials from Environment Variable');
    } else {
      // Fallback to local file
      const serviceAccountPath = path.resolve('config/firebase-service-account.json');
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log('✅ Loaded Firebase credentials from Local File');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Admin initialization failed. Push notifications will not work.');
    console.warn('Reason:', error.message);
  }
};

// Function to send a notification to a specific user
export const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token || typeof token !== 'string' || token.length < 10) return;
  if (!admin.apps || admin.apps.length === 0) {
    console.warn('⚠️ Firebase Admin not initialized. Skipping single push.');
    return;
  }

  // FCM data must only have string values
  const stringifiedData = {};
  for (const [k, v] of Object.entries(data || {})) {
    stringifiedData[k] = String(v ?? '');
  }

  const message = {
    notification: { title, body },
    data: stringifiedData,
    token: token,
    android: {
      priority: 'high',
      notification: {
        channelId: 'study_reminders',
        defaultSound: true,
        defaultVibrateTimings: true,
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('Error sending FCM message:', error.message || error);
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
      // Clean up invalid tokens
      await User.updateOne({ fcmToken: token }, { $set: { fcmToken: null } });
    }
  }
};

// Helper to send multicast push notifications to multiple tokens in 500-sized chunks
export const sendMulticastPushNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens || !tokens.length) return { successCount: 0, failureCount: 0 };
  if (!admin.apps || admin.apps.length === 0) {
    console.warn('⚠️ Firebase Admin not initialized. Skipping multicast push.');
    return { successCount: 0, failureCount: 0 };
  }

  const validTokens = Array.from(new Set(tokens.filter(t => t && typeof t === 'string' && t.length > 10)));
  if (!validTokens.length) return { successCount: 0, failureCount: 0 };

  const stringifiedData = {};
  for (const [k, v] of Object.entries(data || {})) {
    stringifiedData[k] = String(v ?? '');
  }

  const messages = validTokens.map(token => ({
    notification: { title, body },
    data: stringifiedData,
    token,
    android: {
      priority: 'high',
      notification: {
        channelId: 'study_reminders',
        defaultSound: true,
        defaultVibrateTimings: true,
      }
    }
  }));

  const batches = [];
  for (let i = 0; i < messages.length; i += 500) {
    batches.push(messages.slice(i, i + 500));
  }

  let totalSuccess = 0;
  let totalFail = 0;
  const failedTokens = [];

  for (const batch of batches) {
    try {
      const response = await admin.messaging().sendEach(batch);
      totalSuccess += response.successCount;
      totalFail += response.failureCount;

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-registration-token') {
              failedTokens.push(batch[idx].token);
            }
          }
        });
      }
    } catch (err) {
      console.error('Error sending multicast batch:', err);
    }
  }

  if (failedTokens.length > 0) {
    try {
      await User.updateMany(
        { fcmToken: { $in: failedTokens } },
        { $set: { fcmToken: null } }
      );
    } catch (e) {
      console.error('Failed to cleanup invalid tokens:', e);
    }
  }

  return { successCount: totalSuccess, failureCount: totalFail };
};

// Friendly IST date/time formatter for push notification messages
export const formatDueDateForNotification = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const istTarget = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const timeStr = istTarget.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const nowDay = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
  const targetDay = new Date(istTarget.getFullYear(), istTarget.getMonth(), istTarget.getDate());
  const dateDiffDays = Math.round((targetDay - nowDay) / (24 * 60 * 60 * 1000));

  if (dateDiffDays === 0) {
    return `today at ${timeStr}`;
  } else if (dateDiffDays === 1) {
    return `tomorrow at ${timeStr}`;
  } else if (dateDiffDays === -1) {
    return `yesterday at ${timeStr}`;
  } else {
    return istTarget.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
};

// Cron Job: Run every day at 10:00 AM
export const startInactivityCron = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ Running Inactivity Check Cron...');

    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Find users active more than 1 day ago who have an FCM token
      // We also check for users who haven't been nudged today (optional refinement)
      const inactiveUsers = await User.find({
        lastActiveAt: { $lt: oneDayAgo },
        fcmToken: { $ne: null }
      });

      console.log(`Found ${inactiveUsers.length} inactive users.`);

      for (const user of inactiveUsers) {
        await sendPushNotification(
          user.fcmToken,
          'Ready for your next adventure?',
          `Hi ${user.name || 'Learner'}! It's been 1 day. Your story is waiting for you. Let's solve the next Science mystery!`,
          { type: 'inactivity_nudge' }
        );
      }
    } catch (error) {
      console.error('Error in Inactivity Cron:', error);
    }
  });
  console.log('🚀 Inactivity Cron Job Scheduled (Daily 10:00 AM)');
};

// Cron Job: Run every day at 5:00 PM IST
export const startDailyMassNotificationCron = () => {
  // 5:00 PM IST
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ Running Daily Mass Notification Cron (5 PM IST)...');

    try {
      // Create a distributed lock for today's date to prevent duplicate pushes from multiple server instances (or local dev running simultaneously)
      const todayString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-');
      const lockKey = `cron_mass_notify_${todayString}`;
      
      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for daily mass notification on ${todayString}` } },
        { upsert: true, returnDocument: 'before' } // 'before' returns null if it was inserted (i.e. we got the lock)
      );
      
      if (lock) {
        console.log(`🔒 Daily Mass Notification already ran today by another instance (Lock found). Skipping.`);
        return;
      }

      const dayOfWeek = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
      
      const dailyMessages = {
        Monday: {
          title: "Blast off into Monday! 🚀",
          body: "Your next Science adventure is waiting! Let's explore something awesome today."
        },
        Tuesday: {
          title: "Level Up Tuesday! 🎮",
          body: "It's time to collect some Stars! Complete a quick mission and boost your brain power today."
        },
        Wednesday: {
          title: "Mid-week Magic! ✨",
          body: "You're halfway through the week! Keep your awesome learning streak going!"
        },
        Thursday: {
          title: "Brain power activate! ⚡",
          body: "Time for a quick fun challenge before the weekend. Let's go!"
        },
        Friday: {
          title: "Friday Fun-day! 🎉",
          body: "School's almost out! Finish the week like a true Science champion!"
        },
        Saturday: {
          title: "Weekend Explorer! 🦖",
          body: "Got 5 minutes of free time? Let's discover something cool today!"
        },
        Sunday: {
          title: "Sunday Funday! 🕹️",
          body: "Level up before Monday! A quick mission now makes you a genius tomorrow."
        }
      };

      const selectedMessage = dailyMessages[dayOfWeek] || dailyMessages['Monday'];
      const TITLE = selectedMessage.title;
      const BODY = selectedMessage.body;
      const ACTION_URL = "/learn";

      const users = await User.find({ fcmToken: { $ne: null } }, 'name fcmToken currentStreak');
      if (users.length === 0) return;

      const validUsers = users.filter(u => u.fcmToken && u.fcmToken.length > 10);
      if (validUsers.length === 0) return;

      // Deduplicate by fcmToken so a single device doesn't get multiple notifications (e.g. if the user has multiple test accounts)
      // We will keep the account with the highest streak for the notification.
      const uniqueDeviceMap = new Map();
      validUsers.forEach(user => {
        const existing = uniqueDeviceMap.get(user.fcmToken);
        const currentStreak = user.currentStreak || 0;
        if (!existing || currentStreak > (existing.currentStreak || 0)) {
          uniqueDeviceMap.set(user.fcmToken, user);
        }
      });
      const uniqueValidUsers = Array.from(uniqueDeviceMap.values());

      const messages = uniqueValidUsers.map(user => {
        const streak = user.currentStreak || 0;
        const streakText = streak > 0 
          ? ` 🔥 Don't lose your ${streak}-day streak!` 
          : ` 🔥 Time to start a brand new streak today!`;
          
        return {
          notification: { 
            title: selectedMessage.title, 
            body: selectedMessage.body + streakText 
          },
          data: { url: ACTION_URL, type: 'daily_mass' },
          token: user.fcmToken,
          android: {
            priority: 'high',
            notification: {
              channelId: 'study_reminders',
              defaultSound: true,
              defaultVibrateTimings: true,
            }
          }
        };
      });

      const batches = [];
      for (let i = 0; i < messages.length; i += 500) {
        batches.push(messages.slice(i, i + 500));
      }

      for (const batch of batches) {
        const response = await admin.messaging().sendEach(batch);
        
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx].token);
            }
          });
          
          await User.updateMany(
            { fcmToken: { $in: failedTokens } },
            { $set: { fcmToken: null } }
          );
        }
      }
      
      console.log('✅ Daily Mass Notification completed.');
    } catch (error) {
      console.error('Error in Daily Mass Notification Cron:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  console.log('🚀 Daily Mass Notification Cron Scheduled (Daily 5:00 PM IST)');
};

// Cron Job: Run every day at 8:00 PM IST to warn users about expiring streaks
export const startStreakRiskNotificationCron = () => {
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Running Streak Risk Notification Cron (8 PM IST)...');

    try {
      const todayString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-');
      const lockKey = `cron_streak_risk_${todayString}`;
      
      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for streak risk notification on ${todayString}` } },
        { upsert: true, returnDocument: 'before' }
      );
      
      if (lock) {
        console.log(`🔒 Streak Risk Notification already ran today by another instance. Skipping.`);
        return;
      }

      // We want users whose lastStreakDate is older than today, and who have a streak > 0
      // To keep it simple, let's just find users with a streak > 0, and check if they've been active today.
      // Wait, lastStreakDate represents the local date of their last completed module.
      // Or we can check if lastActiveAt < start of today IST
      const now = new Date();
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const startOfTodayIST = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate(), 0, 0, 0);

      const users = await User.find({ 
        fcmToken: { $ne: null },
        currentStreak: { $gt: 0 },
        // If lastActiveAt is before today, they haven't logged in today
        lastActiveAt: { $lt: startOfTodayIST }
      }, 'name fcmToken currentStreak lastActiveAt');

      const validUsers = users.filter(u => u.fcmToken && u.fcmToken.length > 10);
      
      const uniqueDeviceMap = new Map();
      validUsers.forEach(user => {
        const existing = uniqueDeviceMap.get(user.fcmToken);
        if (!existing || user.currentStreak > existing.currentStreak) {
          uniqueDeviceMap.set(user.fcmToken, user);
        }
      });
      const uniqueValidUsers = Array.from(uniqueDeviceMap.values());

      if (uniqueValidUsers.length === 0) {
        console.log('No users at risk of losing their streak today.');
        return;
      }

      console.log(`Sending streak risk notifications to ${uniqueValidUsers.length} users.`);

      const messages = uniqueValidUsers.map(user => {
        return {
          notification: { 
            title: "⚠️ Streak at Risk!", 
            body: `Agent ${user.name || ''}, your ${user.currentStreak}-day streak is about to break! Open the app now and complete a module to save it.` 
          },
          data: { url: "/learn", type: "streak_risk" },
          token: user.fcmToken,
          android: {
            priority: 'high',
            notification: {
              channelId: 'study_reminders',
              defaultSound: true,
              defaultVibrateTimings: true,
            }
          }
        };
      });

      const batches = [];
      for (let i = 0; i < messages.length; i += 500) {
        batches.push(messages.slice(i, i + 500));
      }

      for (const batch of batches) {
        const response = await admin.messaging().sendEach(batch);
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx].token);
            }
          });
          await User.updateMany(
            { fcmToken: { $in: failedTokens } },
            { $set: { fcmToken: null } }
          );
        }
      }
      
      console.log('✅ Streak Risk Notification completed.');
    } catch (error) {
      console.error('Error in Streak Risk Notification Cron:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  console.log('🚀 Streak Risk Notification Cron Scheduled (Daily 8:00 PM IST)');
};

// Cron Job: Run every 30 minutes to check if users dropped in rank
export const startLeaderboardRankCheckCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ Running Leaderboard Rank Check Cron...');

    try {
      const now = new Date();
      const lockKey = `cron_leaderboard_rank_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}_${Math.floor(now.getMinutes()/30)}`;
      
      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for leaderboard check` } },
        { upsert: true, returnDocument: 'before' }
      );
      
      if (lock) return;

      const schools = await User.distinct('school');
      
      const messages = [];
      const failedTokens = [];

      for (const school of schools) {
        if (!school) continue;
        
        // Sort users in school by totalPoints descending, just like the actual leaderboard
        const usersInSchool = await User.find({ school })
                                        .sort({ totalPoints: -1 })
                                        .select('name fcmToken totalPoints lastKnownRank');
                                        
        for (let i = 0; i < usersInSchool.length; i++) {
          const user = usersInSchool[i];
          const currentRank = i + 1;
          
          if (user.lastKnownRank && currentRank > user.lastKnownRank && user.fcmToken && user.fcmToken.length > 10) {
            // Rank dropped! Meaning someone passed them.
            messages.push({
              notification: { 
                title: "🚨 You lost your rank!", 
                body: `Oh no! Someone just passed you. You dropped to Rank #${currentRank}. Complete a module to reclaim your spot!` 
              },
              data: { url: "/learn", type: "rank_drop" },
              token: user.fcmToken,
              android: {
                priority: 'high',
                notification: {
                  channelId: 'study_reminders',
                  defaultSound: true,
                }
              }
            });
          }
          
          if (user.lastKnownRank !== currentRank) {
            await User.updateOne({ _id: user._id }, { $set: { lastKnownRank: currentRank } });
          }
        }
      }

      if (messages.length === 0) return;

      console.log(`Sending rank drop notifications to ${messages.length} users.`);

      const batches = [];
      for (let i = 0; i < messages.length; i += 500) {
        batches.push(messages.slice(i, i + 500));
      }

      for (const batch of batches) {
        const response = await admin.messaging().sendEach(batch);
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx].token);
            }
          });
        }
      }
      
      if (failedTokens.length > 0) {
        await User.updateMany(
          { fcmToken: { $in: failedTokens } },
          { $set: { fcmToken: null } }
        );
      }
      
    } catch (error) {
      console.error('Error in Leaderboard Rank Check Cron:', error);
    }
  });
  console.log('🚀 Leaderboard Rank Check Cron Scheduled (Every 30 mins)');
};

// =========================================================================
// 7-DAY CLASS-SPECIFIC CHAPTER NOTIFICATION CAMPAIGN (Sept 8 - Sept 15, 2026)
// =========================================================================

export const CHAPTER_CAMPAIGN_CONFIG = {
  class6: {
    chapterId: '6a3bb22176ac5c9f79af2fb8',
    title: 'Chapter 6: Material Around Us',
    url: '/learn?chapterId=6a3bb22176ac5c9f79af2fb8',
    messages: [
      { title: "🚨 NEW CHAPTER ALERT! 🚀", body: "Chapter 6: Material Around Us is now live! Discover the secrets of what things are made of. Tap to explore!" },
      { title: "🎉 New Chapter Alert: Material Around Us!", body: "Can you sort objects by their properties? Tap to dive into brand-new Chapter 6!" },
      { title: "📢 New Chapter Dropped! 🔬", body: "Explore transparent, translucent & opaque materials in your new chapter. Start now!" },
      { title: "⚡ Fresh Chapter Alert! 🧪", body: "Soluble or insoluble? Floating or sinking? Find out in brand-new Chapter 6 now!" },
      { title: "⭐ New Chapter Alert: Collect Your Stars!", body: "Chapter 6: Material Around Us is waiting for you! Tap to play and level up!" },
      { title: "🎯 New Chapter Mission! 🔍", body: "Step into Chapter 6 and uncover the secrets of everyday materials. Tap to open!" },
      { title: "🚀 New Chapter Alert!", body: "Master Chapter 6: Material Around Us today and top the leaderboard! Tap to jump in!" }
    ]
  },
  class7: {
    chapterId: '6a75ce3ac7a9f6781800ceb4',
    title: 'Chapter 5: Changes Around Us - Physical & Chemical',
    url: '/learn?chapterId=6a75ce3ac7a9f6781800ceb4',
    messages: [
      { title: "🚨 NEW CHAPTER ALERT! ⚗️", body: "Chapter 5: Changes Around Us is now live! Explore how matter transforms. Tap to begin!" },
      { title: "🎉 New Chapter Alert: Changes Around Us!", body: "Rusting, burning, melting, or dissolving? Discover the chemistry in your new chapter!" },
      { title: "📢 New Chapter Dropped! 🔥", body: "Can a baked cake turn back into batter? Explore reversible & irreversible changes in Chapter 5!" },
      { title: "⚡ Fresh Chapter Alert! 🧪", body: "Why does iron rust in moist air? Uncover chemical reactions in your brand-new chapter!" },
      { title: "⭐ New Chapter Alert: Collect Your Stars!", body: "Complete the new Chapter 5 mission and collect stars for your streak! Tap to play!" },
      { title: "🔍 New Chapter Detective Challenge!", body: "Can you identify which change is permanent? Test your skills in brand-new Chapter 5!" },
      { title: "🚀 New Chapter Alert!", body: "Master Chapter 5: Changes Around Us today and boost your science score. Tap to jump in!" }
    ]
  },
  class8: {
    pressure: {
      chapterId: '6a7bf454a52e6503592bc8aa',
      title: 'Chapter 6: Pressure, Winds, Storms, and Cyclones',
      url: '/learn?chapterId=6a7bf454a52e6503592bc8aa',
      messages: [
        { title: "🚨 NEW CHAPTER ALERT! 🌪️", body: "Chapter 6: Pressure, Winds & Cyclones is now live! Tap to uncover how giant storms form." },
        { title: "🎉 New Chapter Alert: Pressure & Storms!", body: "Air exerts massive pressure all around us! See atmospheric pressure in action in new Chapter 6." },
        { title: "⚡ Fresh Chapter Alert: Cyclones & Lightning!", body: "What creates electric charges in storm clouds? Discover the science in brand-new Chapter 6!" }
      ]
    },
    forces: {
      chapterId: '6a54f36e3b9f14cd2bab17c2',
      title: 'Chapter 5: Exploring Forces',
      url: '/learn?chapterId=6a54f36e3b9f14cd2bab17c2',
      messages: [
        { title: "🚨 NEW CHAPTER ALERT! ⚡", body: "Chapter 5: Exploring Forces is now live! Push, pull, friction, and gravity await you. Tap to start!" },
        { title: "🎉 New Chapter Alert: Exploring Forces!", body: "What makes things move or stop? Master the fundamental rules of motion in new Chapter 5!" },
        { title: "🚀 Fresh Chapter Dropped! 🎯", body: "Contact vs non-contact forces: solve the mysteries of motion in brand-new Chapter 5!" }
      ]
    },
    matter: {
      chapterId: '6a901acf49caff82aeb5f0ff',
      title: 'Chapter 7: Particulate Nature of Matter',
      url: '/learn?chapterId=6a901acf49caff82aeb5f0ff',
      messages: [
        { title: "🚨 NEW CHAPTER ALERT! 🔬", body: "Chapter 7: Particulate Nature of Matter is now live! Zoom into atoms and molecules. Tap to explore!" },
        { title: "🎉 New Chapter Alert: Nature of Matter!", body: "How do particles behave in solids, liquids, and gases? Discover the building blocks in new Chapter 7!" },
        { title: "🧪 Fresh Chapter Dropped! ✨", body: "Explore Brownian motion and particle attraction in your brand-new chapter. Tap to jump in!" }
      ]
    }
  }
};

/**
 * Sends targeted chapter push notifications for the specified time slot ('7pm' or '8pm').
 * Supports isDryRun flag for safe testing without sending actual pushes.
 */
export const sendChapterNotificationsForSlot = async (slot = '7pm', isDryRun = false) => {
  console.log(`\n📢 [Chapter Notification Campaign] Starting dispatch for slot: ${slot.toUpperCase()} (Dry-Run: ${isDryRun})...`);

  // Campaign start date: Sept 8, 2026 IST
  const campaignStartDate = new Date('2026-09-08T00:00:00+05:30');
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const diffDays = Math.floor((istTime - campaignStartDate) / (24 * 60 * 60 * 1000));
  const dayIndex = Math.max(0, diffDays);

  console.log(`📅 Campaign Day Index: ${dayIndex + 1} of 7 (Date: ${istTime.toDateString()})`);

  // Determine which classes and chapters to dispatch in this slot
  const dispatchPlan = [];

  if (slot === '7pm') {
    // 1. Class 6: Chapter 6: Material Around Us
    const c6Config = CHAPTER_CAMPAIGN_CONFIG.class6;
    const c6Msg = c6Config.messages[dayIndex % c6Config.messages.length];
    dispatchPlan.push({
      classLevel: '6',
      chapterTitle: c6Config.title,
      url: c6Config.url,
      title: c6Msg.title,
      body: c6Msg.body
    });

    // 2. Class 7: Chapter 5: Changes Around Us
    const c7Config = CHAPTER_CAMPAIGN_CONFIG.class7;
    const c7Msg = c7Config.messages[dayIndex % c7Config.messages.length];
    dispatchPlan.push({
      classLevel: '7',
      chapterTitle: c7Config.title,
      url: c7Config.url,
      title: c7Msg.title,
      body: c7Msg.body
    });

    // 3. Class 8: 7 PM slot rotates between Chapter 6 (Pressure) and Chapter 5 (Forces)
    const c8Config = CHAPTER_CAMPAIGN_CONFIG.class8;
    const c8Target = (dayIndex % 2 === 0) ? c8Config.pressure : c8Config.forces;
    const c8Msg = c8Target.messages[Math.floor(dayIndex / 2) % c8Target.messages.length];
    dispatchPlan.push({
      classLevel: '8',
      chapterTitle: c8Target.title,
      url: c8Target.url,
      title: c8Msg.title,
      body: c8Msg.body
    });
  } else if (slot === '8pm') {
    // 8 PM slot is for Class 8 (2nd chapter of the day): rotates between Chapter 7 (Matter) and Chapter 5 (Forces)
    const c8Config = CHAPTER_CAMPAIGN_CONFIG.class8;
    const c8Target = (dayIndex % 2 === 0) ? c8Config.matter : c8Config.pressure;
    const c8Msg = c8Target.messages[Math.floor(dayIndex / 2) % c8Target.messages.length];
    dispatchPlan.push({
      classLevel: '8',
      chapterTitle: c8Target.title,
      url: c8Target.url,
      title: c8Msg.title,
      body: c8Msg.body
    });
  }

  let totalRecipients = 0;

  for (const item of dispatchPlan) {
    const clsDoc = await ClassLevel.findOne({ name: item.classLevel });
    const query = {
      fcmToken: { $ne: null },
      $or: [
        { classLevel: item.classLevel },
        { classLevel: `Class ${item.classLevel}` },
        { classLevel: `class ${item.classLevel}` }
      ]
    };
    if (clsDoc) {
      query.$or.push({ classId: clsDoc._id });
    }

    const users = await User.find(query, 'name fcmToken classLevel currentStreak');
    const validUsers = users.filter(u => u.fcmToken && u.fcmToken.length > 10);

    // Deduplicate by fcmToken
    const uniqueDeviceMap = new Map();
    validUsers.forEach(user => {
      const existing = uniqueDeviceMap.get(user.fcmToken);
      const currentStreak = user.currentStreak || 0;
      if (!existing || currentStreak > (existing.currentStreak || 0)) {
        uniqueDeviceMap.set(user.fcmToken, user);
      }
    });
    const uniqueValidUsers = Array.from(uniqueDeviceMap.values());

    console.log(`\n🎯 Class ${item.classLevel}: Target "${item.chapterTitle}"`);
    console.log(`   Recipients: ${uniqueValidUsers.length} active devices`);
    console.log(`   Title: "${item.title}"`);
    console.log(`   Body: "${item.body}"`);
    console.log(`   Deep-Link: "${item.url}"`);

    totalRecipients += uniqueValidUsers.length;

    if (isDryRun) {
      continue;
    }

    const messages = uniqueValidUsers.map(user => ({
      notification: {
        title: item.title,
        body: item.body
      },
      data: {
        url: item.url,
        type: 'chapter_promo',
        chapterId: item.url.split('chapterId=')[1] || ''
      },
      token: user.fcmToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'study_reminders',
          defaultSound: true,
          defaultVibrateTimings: true,
        }
      }
    }));

    const batches = [];
    for (let i = 0; i < messages.length; i += 500) {
      batches.push(messages.slice(i, i + 500));
    }

    for (const batch of batches) {
      const response = await admin.messaging().sendEach(batch);
      console.log(`   🚀 Sent batch of ${batch.length} (Success: ${response.successCount}, Failures: ${response.failureCount})`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx].token);
          }
        });

        if (failedTokens.length > 0) {
          await User.updateMany(
            { fcmToken: { $in: failedTokens } },
            { $set: { fcmToken: null } }
          );
        }
      }
    }
  }

  console.log(`\n✅ [Chapter Notification Campaign] Slot ${slot.toUpperCase()} completed. Total devices reached: ${totalRecipients}\n`);
  return { slot, totalRecipients };
};

/**
 * Starts the 7-day Chapter Push Notification Cron at 7:00 PM IST and 8:00 PM IST.
 */
export const startChapterSpecificNotificationCron = () => {
  // 1. 7:00 PM IST (19:00 IST)
  cron.schedule('0 19 * * *', async () => {
    console.log('⏰ Running Chapter Specific Notification Cron (7 PM IST)...');
    try {
      const now = new Date();
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const campaignStartDate = new Date('2026-09-08T00:00:00+05:30');
      const diffDays = Math.floor((istTime - campaignStartDate) / (24 * 60 * 60 * 1000));
      
      // Active for 7 days (Sept 8 to Sept 15 inclusive)
      if (diffDays < 0 || diffDays > 7) {
        console.log(`📅 Chapter Campaign not active for day diff ${diffDays}. Skipping.`);
        return;
      }

      const todayString = istTime.toISOString().split('T')[0];
      const lockKey = `cron_chapter_push_7pm_${todayString}`;

      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for chapter push 7pm on ${todayString}` } },
        { upsert: true, returnDocument: 'before' }
      );

      if (lock) {
        console.log(`🔒 Chapter push 7 PM already ran today. Skipping.`);
        return;
      }

      await sendChapterNotificationsForSlot('7pm', false);
    } catch (error) {
      console.error('Error in Chapter Notification Cron (7 PM):', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 2. 8:00 PM IST (20:00 IST)
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Running Chapter Specific Notification Cron (8 PM IST)...');
    try {
      const now = new Date();
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const campaignStartDate = new Date('2026-09-08T00:00:00+05:30');
      const diffDays = Math.floor((istTime - campaignStartDate) / (24 * 60 * 60 * 1000));

      if (diffDays < 0 || diffDays > 7) {
        console.log(`📅 Chapter Campaign not active for day diff ${diffDays}. Skipping.`);
        return;
      }

      const todayString = istTime.toISOString().split('T')[0];
      const lockKey = `cron_chapter_push_8pm_${todayString}`;

      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for chapter push 8pm on ${todayString}` } },
        { upsert: true, returnDocument: 'before' }
      );

      if (lock) {
        console.log(`🔒 Chapter push 8 PM already ran today. Skipping.`);
        return;
      }

      await sendChapterNotificationsForSlot('8pm', false);
    } catch (error) {
      console.error('Error in Chapter Notification Cron (8 PM):', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('🚀 Chapter Specific Notification Crons Scheduled (Daily 7:00 PM & 8:00 PM IST for 7 Days)');
};

/**
 * Cron Job: Daily Exam Mode is Live notification at 7:30 PM IST
 */
export const startExamModeLiveNotificationCron = () => {
  // 7:30 PM IST -> 19:30 IST ('30 19 * * *')
  cron.schedule('30 19 * * *', async () => {
    console.log('⏰ Running Exam Mode Live Notification Cron (7:30 PM IST)...');

    try {
      const todayString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-');
      const lockKey = `cron_exam_mode_live_${todayString}`;

      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for exam mode live notification on ${todayString}` } },
        { upsert: true, returnDocument: 'before' }
      );

      if (lock) {
        console.log(`🔒 Exam Mode Live Notification already ran today (Lock found: ${lockKey}). Skipping.`);
        return;
      }

      const examMessages = [
        {
          title: "🎯 Exam Mode is LIVE!",
          body: "Test your skills with real exam questions and instant AI feedback! Tap to take the test now."
        },
        {
          title: "⚡ Score 100% in Your Exams! 🏆",
          body: "Exam Mode is now open! Practice descriptive answers & MCQs for your chapters today."
        },
        {
          title: "📝 Ready for Exam Practice? 🚀",
          body: "Exam Mode is live! Revise key concepts and test your accuracy before your school tests."
        },
        {
          title: "🔥 Challenge Yourself in Exam Mode!",
          body: "Practice real chapter exam questions, get evaluated instantly, and level up your grades!"
        }
      ];

      // Rotate message day by day
      const dayNum = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      const selected = examMessages[dayNum % examMessages.length];
      const ACTION_URL = "/exam";

      const users = await User.find({ fcmToken: { $ne: null } }, 'name fcmToken currentStreak');
      if (!users || users.length === 0) {
        console.log('No users with FCM tokens found for Exam Mode notification.');
        return;
      }

      const validUsers = users.filter(u => u.fcmToken && u.fcmToken.length > 10);
      if (validUsers.length === 0) return;

      // Deduplicate devices by token
      const uniqueDeviceMap = new Map();
      validUsers.forEach(user => {
        const existing = uniqueDeviceMap.get(user.fcmToken);
        const currentStreak = user.currentStreak || 0;
        if (!existing || currentStreak > (existing.currentStreak || 0)) {
          uniqueDeviceMap.set(user.fcmToken, user);
        }
      });
      const uniqueValidUsers = Array.from(uniqueDeviceMap.values());

      console.log(`📢 Sending Exam Mode Live notification to ${uniqueValidUsers.length} active devices...`);

      const messages = uniqueValidUsers.map(user => ({
        notification: {
          title: selected.title,
          body: selected.body
        },
        data: {
          url: ACTION_URL,
          type: 'exam_mode_live'
        },
        token: user.fcmToken,
        android: {
          priority: 'high',
          notification: {
            channelId: 'study_reminders',
            defaultSound: true,
            defaultVibrateTimings: true,
          }
        }
      }));

      const batches = [];
      for (let i = 0; i < messages.length; i += 500) {
        batches.push(messages.slice(i, i + 500));
      }

      let successCount = 0;
      let failureCount = 0;

      for (const batch of batches) {
        const response = await admin.messaging().sendEach(batch);
        successCount += response.successCount;
        failureCount += response.failureCount;

        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx].token);
            }
          });

          if (failedTokens.length > 0) {
            await User.updateMany(
              { fcmToken: { $in: failedTokens } },
              { $set: { fcmToken: null } }
            );
          }
        }
      }

      console.log(`✅ Exam Mode Live Notification completed. (Sent: ${successCount}, Failed: ${failureCount})`);
    } catch (error) {
      console.error('Error in Exam Mode Live Notification Cron:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('🚀 Exam Mode Live Notification Cron Scheduled (Daily 7:30 PM IST)');
};

// Cron Job: Automatically reset weekly challenges in the database every Monday at 00:00 IST
export const startWeeklyGoalResetCron = () => {
  cron.schedule('0 0 * * 1', async () => {
    console.log('⏰ Running Weekly Challenge Reset Cron (Monday 00:00 IST)...');
    try {
      const currentMonday = getCurrentMondayIST();
      const result = await User.updateMany(
        {
          $or: [
            { "weeklyGoal.lastReset": { $lt: currentMonday } },
            { "weeklyGoal.lastReset": { $exists: false } },
            { "weeklyGoal": { $exists: false } }
          ]
        },
        {
          $set: {
            "weeklyGoal.modulesCompleted": 0,
            "weeklyGoal.claimed": false,
            "weeklyGoal.lastReset": currentMonday
          }
        }
      );
      console.log(`✅ Weekly Challenge Reset completed. Reset ${result.modifiedCount} users for week starting ${currentMonday.toISOString()}`);
    } catch (err) {
      console.error('Error in Weekly Challenge Reset Cron:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('🚀 Weekly Challenge Reset Cron Scheduled (Every Monday 00:00 IST)');
};

// Sync outdated weekly challenges immediately on server startup
export const syncOutdatedWeeklyGoals = async () => {
  try {
    const currentMonday = getCurrentMondayIST();
    const result = await User.updateMany(
      {
        $or: [
          { "weeklyGoal.lastReset": { $lt: currentMonday } },
          { "weeklyGoal.lastReset": { $exists: false } },
          { "weeklyGoal": { $exists: false } }
        ]
      },
      {
        $set: {
          "weeklyGoal.modulesCompleted": 0,
          "weeklyGoal.claimed": false,
          "weeklyGoal.lastReset": currentMonday
        }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Startup Sync: Auto-reset ${result.modifiedCount} outdated weekly challenge records for week starting ${currentMonday.toISOString()}`);
    }
  } catch (err) {
    console.error('Error syncing outdated weekly challenges on startup:', err.message);
  }
};

// =========================================================================
// CLASSROOM & HOMEWORK NOTIFICATIONS & AUTOMATED CRONS
// =========================================================================

/**
 * 1. Notify individual student when added to a classroom
 */
export const sendClassroomEnrolledNotification = async ({ studentId, classroom, teacherName }) => {
  try {
    if (!studentId || !classroom) return;
    const student = await User.findById(studentId).select('name username fcmToken').lean();
    if (!student || !student.fcmToken) return;

    const teacher = teacherName || classroom.teacherId?.name || classroom.teacherId?.username || 'Your Teacher';
    const title = `🏫 Added to ${classroom.name}!`;
    const body = `${teacher} added you to ${classroom.name} (${classroom.subject || 'Science'}). Tap to view your classroom & homework!`;

    await sendPushNotification(
      student.fcmToken,
      title,
      body,
      {
        url: '/homework',
        type: 'classroom_enrolled',
        classroomId: classroom._id.toString(),
      }
    );
    console.log(`📢 Sent classroom enrolled push to ${student.name || student.username}`);
  } catch (err) {
    console.error('Error sending classroom enrolled notification:', err);
  }
};

/**
 * 2. Notify multiple students bulk-enrolled into a classroom
 */
export const sendClassroomBulkEnrolledNotifications = async ({ studentIds, classroom, teacherName }) => {
  try {
    if (!studentIds || !studentIds.length || !classroom) return;
    const students = await User.find(
      { _id: { $in: studentIds }, fcmToken: { $ne: null } },
      'name username fcmToken'
    ).lean();

    const tokens = students.map(s => s.fcmToken).filter(t => t && t.length > 10);
    if (!tokens.length) return;

    const teacher = teacherName || 'Your Teacher';
    const title = `🏫 Added to ${classroom.name}!`;
    const body = `${teacher} added you to ${classroom.name} (${classroom.subject || 'Science'})! Check your classroom & homework missions.`;

    await sendMulticastPushNotification({
      tokens,
      title,
      body,
      data: {
        url: '/homework',
        type: 'classroom_enrolled',
        classroomId: classroom._id.toString(),
      }
    });
    console.log(`📢 Sent bulk classroom enrolled push to ${tokens.length} students in ${classroom.name}`);
  } catch (err) {
    console.error('Error sending bulk classroom enrolled notifications:', err);
  }
};

/**
 * 3. Notify teacher when a student joins their classroom using the class code
 */
export const sendNewStudentJoinedNotification = async ({ teacherId, studentName, classroom }) => {
  try {
    if (!teacherId || !classroom) return;
    const teacher = await User.findById(teacherId).select('name username fcmToken').lean();
    if (!teacher || !teacher.fcmToken) return;

    const title = `👤 New Student Joined!`;
    const body = `${studentName || 'A new student'} just joined your classroom "${classroom.name}".`;

    await sendPushNotification(
      teacher.fcmToken,
      title,
      body,
      {
        url: `/teacher/classroom/${classroom._id.toString()}`,
        type: 'student_joined_class',
        classroomId: classroom._id.toString(),
      }
    );
    console.log(`📢 Sent student joined push to teacher for classroom ${classroom.name}`);
  } catch (err) {
    console.error('Error sending student joined notification to teacher:', err);
  }
};

/**
 * 4. Notify all enrolled classroom students when a new homework is assigned
 */
export const sendHomeworkAssignedNotification = async ({ assignment, classroom, teacherName }) => {
  try {
    if (!assignment || !classroom) return;
    const studentIds = classroom.students || [];
    if (!studentIds.length) return;

    const students = await User.find(
      { _id: { $in: studentIds }, fcmToken: { $ne: null } },
      'name username fcmToken'
    ).lean();

    const tokens = students.map(s => s.fcmToken).filter(t => t && t.length > 10);
    if (!tokens.length) return;

    const dueFormatted = formatDueDateForNotification(assignment.dueDate);
    const teacher = teacherName || 'Your Teacher';
    const title = `📝 New Homework: ${assignment.title}`;
    const body = `${teacher} assigned new homework for ${classroom.name}! Chapter: ${assignment.chapterTitle} (Due: ${dueFormatted}). Tap to start!`;

    await sendMulticastPushNotification({
      tokens,
      title,
      body,
      data: {
        url: '/homework',
        type: 'homework_assigned',
        assignmentId: assignment._id.toString(),
        classroomId: classroom._id.toString(),
      }
    });
    console.log(`📢 Sent homework assigned push to ${tokens.length} students in ${classroom.name}`);
  } catch (err) {
    console.error('Error sending homework assigned notification:', err);
  }
};

/**
 * 5. Notify student & teacher when a student completes all required lessons for an assignment
 */
export const sendHomeworkCompletedNotifications = async ({ studentId, assignmentId }) => {
  try {
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) return;

    const [classroom, student] = await Promise.all([
      Classroom.findById(assignment.classroomId).populate('teacherId', 'name username fcmToken').lean(),
      User.findById(studentId).select('name username fcmToken').lean(),
    ]);

    if (!classroom || !student) return;

    // Notify the student
    if (student.fcmToken) {
      await sendPushNotification(
        student.fcmToken,
        `🎉 Homework Completed!`,
        `Awesome job, ${student.name || student.username}! You've finished all missions for "${assignment.title}" in ${classroom.name}! 🌟`,
        {
          url: '/homework',
          type: 'homework_completed',
          assignmentId: assignment._id.toString(),
          classroomId: classroom._id.toString(),
        }
      );
      console.log(`📢 Sent homework completed push to student ${student.name || student.username}`);
    }
  } catch (err) {
    console.error('Error sending homework completed notification to student:', err);
  }
};

/**
 * 6. Send manual push reminder from teacher to all pending students of an assignment
 */
export const sendManualNudgeToPendingStudents = async ({ assignmentId, teacherUser }) => {
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const classroom = await Classroom.findById(assignment.classroomId)
      .populate('students', 'name username fcmToken chaptersProgress')
      .lean();

    if (!classroom) throw new Error('Classroom not found');

    const targetModuleIds = (assignment.targetLessons || []).map(l => String(l.moduleId));
    const totalTargets = targetModuleIds.length;

    // Filter pending students who have not completed all targets
    const pendingStudents = (classroom.students || []).filter(student => {
      const completedSet = new Set();
      if (Array.isArray(student.chaptersProgress)) {
        student.chaptersProgress.forEach(cp => {
          if (Array.isArray(cp.completedModules)) {
            cp.completedModules.forEach(mid => completedSet.add(String(mid)));
          }
        });
      }
      const completedCount = targetModuleIds.filter(mid => completedSet.has(mid)).length;
      return totalTargets === 0 || completedCount < totalTargets;
    });

    const pendingTokens = pendingStudents.map(s => s.fcmToken).filter(t => t && t.length > 10);
    const dueFormatted = formatDueDateForNotification(assignment.dueDate);
    const teacherName = teacherUser?.name || teacherUser?.username || 'Your Teacher';

    if (pendingTokens.length > 0) {
      await sendMulticastPushNotification({
        tokens: pendingTokens,
        title: `📢 Homework Reminder from ${teacherName}`,
        body: `Please finish your homework "${assignment.title}" for ${classroom.name} (Due: ${dueFormatted})! Tap to complete your lessons.`,
        data: {
          url: '/homework',
          type: 'teacher_nudge',
          assignmentId: assignment._id.toString(),
          classroomId: classroom._id.toString(),
        }
      });
      console.log(`📢 Sent teacher manual nudge to ${pendingTokens.length} pending students for "${assignment.title}"`);
    }

    assignment.remindersSent = assignment.remindersSent || {};
    assignment.remindersSent.lastManualNudgeAt = new Date();
    await assignment.save();

    return {
      success: true,
      pendingCount: pendingStudents.length,
      nudgedCount: pendingTokens.length,
    };
  } catch (err) {
    console.error('Error sending manual nudge to pending students:', err);
    throw err;
  }
};

/**
 * 7. Automated Cron: Hourly check for homework deadlines (Due Tomorrow, Due Today, and Overdue)
 */
export const startHomeworkDeadlineReminderCron = () => {
  // Run every hour at minute 10 ('10 * * * *')
  cron.schedule('10 * * * *', async () => {
    console.log('⏰ Running Automated Homework Deadline Check Cron...');
    try {
      const now = new Date();

      // Find all active assignments with their classroom info
      const activeAssignments = await Assignment.find({ status: 'active' })
        .populate('classroomId', 'name subject students')
        .lean();

      if (!activeAssignments.length) return;

      for (const assignment of activeAssignments) {
        if (!assignment.classroomId || !assignment.dueDate) continue;
        const classroom = assignment.classroomId;
        const dueDate = new Date(assignment.dueDate);
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        const reminders = assignment.remindersSent || {};

        let shouldRemind = false;
        let reminderType = '';
        let title = '';
        let body = '';
        let updateField = '';

        // 1. Due Tomorrow (~18 to 28 hours before deadline)
        if (diffHours >= 18 && diffHours <= 28 && !reminders.dueTomorrow) {
          shouldRemind = true;
          reminderType = 'homework_due_tomorrow';
          const dueFormatted = formatDueDateForNotification(dueDate);
          title = `⏰ Homework Due Tomorrow!`;
          body = `Don't forget! "${assignment.title}" for ${classroom.name} is due ${dueFormatted}. Complete your missions now!`;
          updateField = 'remindersSent.dueTomorrow';
        }
        // 2. Due Today (0 to 8 hours before deadline)
        else if (diffHours > 0 && diffHours <= 8 && !reminders.dueToday) {
          shouldRemind = true;
          reminderType = 'homework_due_today';
          const dueFormatted = formatDueDateForNotification(dueDate);
          title = `🚨 Homework Due Today!`;
          body = `Final reminder! "${assignment.title}" for ${classroom.name} is due ${dueFormatted}. Finish your lessons now!`;
          updateField = 'remindersSent.dueToday';
        }
        // 3. Overdue (Passed between 1 and 24 hours ago)
        else if (diffHours < 0 && diffHours >= -24 && !reminders.overdue) {
          shouldRemind = true;
          reminderType = 'homework_overdue';
          const dueFormatted = formatDueDateForNotification(dueDate);
          title = `⚠️ Homework Overdue: ${assignment.title}`;
          body = `Your homework for ${classroom.name} was due on ${dueFormatted}. It's not too late to catch up and complete it!`;
          updateField = 'remindersSent.overdue';
        }

        if (!shouldRemind || !updateField) continue;

        // Atomic lock so concurrent processes/instances never fire the same reminder twice
        const locked = await Assignment.findOneAndUpdate(
          { _id: assignment._id, [updateField]: false },
          { $set: { [updateField]: true } }
        );

        if (!locked) continue; // Locked by another instance

        // Determine which students have NOT completed this assignment
        const students = await User.find(
          { _id: { $in: classroom.students || [] }, fcmToken: { $ne: null } },
          'name username fcmToken chaptersProgress'
        ).lean();

        const targetModuleIds = (assignment.targetLessons || []).map(l => String(l.moduleId));
        const totalTargets = targetModuleIds.length;

        const pendingStudents = students.filter(student => {
          const completedSet = new Set();
          if (Array.isArray(student.chaptersProgress)) {
            student.chaptersProgress.forEach(cp => {
              if (Array.isArray(cp.completedModules)) {
                cp.completedModules.forEach(mid => completedSet.add(String(mid)));
              }
            });
          }
          const completedCount = targetModuleIds.filter(mid => completedSet.has(mid)).length;
          return totalTargets === 0 || completedCount < totalTargets;
        });

        const tokens = pendingStudents.map(s => s.fcmToken).filter(t => t && t.length > 10);
        if (tokens.length > 0) {
          console.log(`📢 [Homework Deadline Cron] Sending ${reminderType} to ${tokens.length} pending students for "${assignment.title}"`);
          await sendMulticastPushNotification({
            tokens,
            title,
            body,
            data: {
              url: '/homework',
              type: reminderType,
              assignmentId: assignment._id.toString(),
              classroomId: classroom._id.toString(),
            }
          });
        }
      }
    } catch (err) {
      console.error('Error in Homework Deadline Reminder Cron:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('🚀 Homework Deadline Reminder Cron Scheduled (Hourly at :10 IST)');
};

/**
 * 8. End-of-Day Daily Summary Notification Cron for Teachers (Daily 8:30 PM IST)
 * Consolidates daily student completions and classroom status into a single, non-spammy summary.
 */
export const startTeacherDailySummaryCron = () => {
  cron.schedule('30 20 * * *', async () => {
    console.log('⏰ Running Teacher Daily Summary Cron (8:30 PM IST)...');
    try {
      const todayString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-');
      const lockKey = `cron_teacher_summary_${todayString}`;

      const lock = await SystemSettings.findOneAndUpdate(
        { key: lockKey },
        { $setOnInsert: { key: lockKey, value: 'locked', description: `Lock for teacher daily summary on ${todayString}` } },
        { upsert: true, returnDocument: 'before' }
      );

      if (lock) {
        console.log(`🔒 Teacher daily summary already ran today (Lock found: ${lockKey}). Skipping.`);
        return;
      }

      // Find all teachers who have active classrooms
      const activeClassrooms = await Classroom.find({ isActive: true })
        .populate('teacherId', 'name username fcmToken')
        .populate('students', 'chaptersProgress')
        .lean();

      if (!activeClassrooms.length) return;

      // Group classrooms by teacherId
      const teacherClassroomMap = new Map();
      activeClassrooms.forEach(c => {
        const teacher = c.teacherId;
        if (!teacher || !teacher._id || !teacher.fcmToken || teacher.fcmToken.length < 10) return;
        const tid = teacher._id.toString();
        if (!teacherClassroomMap.has(tid)) {
          teacherClassroomMap.set(tid, {
            teacher,
            classrooms: [],
          });
        }
        teacherClassroomMap.get(tid).classrooms.push(c);
      });

      console.log(`📢 Preparing daily summaries for ${teacherClassroomMap.size} teachers with registered push devices...`);

      for (const [tid, { teacher, classrooms }] of teacherClassroomMap.entries()) {
        const classroomIds = classrooms.map(c => c._id);
        const activeAssignments = await Assignment.find({
          classroomId: { $in: classroomIds },
          status: 'active',
        }).lean();

        const totalEnrolled = classrooms.reduce((acc, c) => acc + (c.students?.length || 0), 0);

        let title = '📊 Daily Teaching Summary';
        let body = '';

        if (activeAssignments.length > 0) {
          let totalCompletedSubmissions = 0;
          let totalPendingSubmissions = 0;

          // Build map of students for fast lookup
          const studentMap = new Map();
          classrooms.forEach(c => {
            (c.students || []).forEach(s => {
              if (s?._id) studentMap.set(s._id.toString(), s);
            });
          });

          activeAssignments.forEach(assignment => {
            const classObj = classrooms.find(c => c._id.toString() === assignment.classroomId.toString());
            const studentsInClass = classObj?.students || [];
            const targetIds = (assignment.targetLessons || []).map(l => String(l.moduleId));
            const totalTargets = targetIds.length;

            studentsInClass.forEach(s => {
              const fullStudent = studentMap.get(s._id?.toString()) || s;
              const completedSet = new Set();
              if (Array.isArray(fullStudent.chaptersProgress)) {
                fullStudent.chaptersProgress.forEach(cp => {
                  if (Array.isArray(cp.completedModules)) {
                    cp.completedModules.forEach(mid => completedSet.add(String(mid)));
                  }
                });
              }
              const isFinished = totalTargets > 0 && targetIds.every(mid => completedSet.has(mid));
              if (isFinished) {
                totalCompletedSubmissions++;
              } else {
                totalPendingSubmissions++;
              }
            });
          });

          const teacherName = teacher.name || teacher.username || 'Teacher';
          title = `📊 Daily Classroom Summary`;
          body = `Hi ${teacherName}! Today's overview: ${totalCompletedSubmissions} submissions finished across your classes (${totalPendingSubmissions} pending). Tap to view full tracking report!`;
        } else if (totalEnrolled > 0) {
          const teacherName = teacher.name || teacher.username || 'Teacher';
          title = `🏫 Classroom Status`;
          body = `Hi ${teacherName}! You have ${totalEnrolled} students across ${classrooms.length} active classroom${classrooms.length === 1 ? '' : 's'}. Assign homework to keep their practice going!`;
        } else {
          continue; // Skip teachers with empty classrooms
        }

        await sendPushNotification(
          teacher.fcmToken,
          title,
          body,
          {
            url: '/teacher',
            type: 'teacher_daily_summary',
          }
        );
      }

      console.log('✅ Teacher Daily Summary Push Notification Cron completed.');
    } catch (err) {
      console.error('Error in Teacher Daily Summary Cron:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('🚀 Teacher Daily Summary Cron Scheduled (Daily 8:30 PM IST)');
};

