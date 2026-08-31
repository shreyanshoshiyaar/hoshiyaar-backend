import admin from 'firebase-admin';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import cron from 'node-cron';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Firebase Admin
export const initFirebase = () => {
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
  if (!token) return;

  const message = {
    notification: { title, body },
    data: data,
    token: token,
    android: {
      priority: 'high',
      notification: {
        channelId: 'study_reminders',
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('Error sending FCM message:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      // Clean up invalid tokens
      await User.updateOne({ fcmToken: token }, { $set: { fcmToken: null } });
    }
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

// Cron Job: Run every day at 7:00 PM IST
export const startDailyMassNotificationCron = () => {
  // 7:00 PM IST
  cron.schedule('0 19 * * *', async () => {
    console.log('⏰ Running Daily Mass Notification Cron (7 PM IST)...');

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
          data: { url: ACTION_URL },
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
  console.log('🚀 Daily Mass Notification Cron Scheduled (Daily 7:00 PM IST)');
};
