import admin from 'firebase-admin';
import User from '../models/User.js';
import cron from 'node-cron';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Firebase Admin
export const initFirebase = () => {
  try {
    const serviceAccountPath = path.resolve('config/firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

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

// Cron Job: Run every day at 5:00 PM
export const startDailyMassNotificationCron = () => {
  // 5:00 PM is 17:00
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ Running Daily Mass Notification Cron...');

    try {
      const TITLE = "Don't break your learning streak! 🔥";
      const BODY = "Just 10 minutes a day keeps the exam stress away. Tap to complete today's module!";
      const ACTION_URL = "/learn";

      const users = await User.find({ fcmToken: { $ne: null } }, 'name fcmToken');
      if (users.length === 0) return;

      const rawTokens = users.map(u => u.fcmToken).filter(t => t && t.length > 10);
      const tokens = [...new Set(rawTokens)];
      if (tokens.length === 0) return;

      const batches = [];
      for (let i = 0; i < tokens.length; i += 500) {
        batches.push(tokens.slice(i, i + 500));
      }

      for (const batch of batches) {
        const message = {
          notification: { title: TITLE, body: BODY },
          data: { url: ACTION_URL },
          tokens: batch,
          android: {
            priority: 'high',
            notification: {
              channelId: 'study_reminders',
              defaultSound: true,
              defaultVibrateTimings: true,
            }
          }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx]);
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
  });
  console.log('🚀 Daily Mass Notification Cron Scheduled (Daily 5:00 PM)');
};
