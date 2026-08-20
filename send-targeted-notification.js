import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import { initFirebase } from './services/notificationService.js';
import admin from 'firebase-admin';

// Load environment variables
config();

// ==========================================
// ✏️ EDIT YOUR NOTIFICATION MESSAGE HERE ✏️
// ==========================================
const TITLE = "Hello from Hoshiyaar!";
const BODY = "We have a special update just for you. Tap here to check it out!";
const ACTION_URL = "/learn"; // Where they go when they click it
// ==========================================

async function sendTargetedNotification() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize Firebase
    initFirebase();

    const targetEmails = [
      'cg.akshitravula2025@gmail.com'
    ];

    console.log('Fetching targeted users...');
    const users = await User.find({ email: { $in: targetEmails } }, 'name username email fcmToken');
    
    if (users.length === 0) {
      console.log('❌ Could not find these users in the database.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users. Checking for push tokens...`);

    const tokens = [];
    
    for (const user of users) {
      if (user.fcmToken && user.fcmToken.length > 10) {
        tokens.push(user.fcmToken);
        console.log(`✅ Push token found for: ${user.name} (${user.email})`);
      } else {
        console.log(`⚠️ NO push token found for: ${user.name} (${user.email}). They may have uninstalled the app or disabled notifications.`);
      }
    }

    if (tokens.length === 0) {
      console.log('❌ No valid tokens found to send notifications to.');
      process.exit(0);
    }

    console.log(`\nSending notification to ${tokens.length} devices...`);

    const message = {
      notification: {
        title: TITLE,
        body: BODY
      },
      data: {
        url: ACTION_URL
      },
      tokens: [...new Set(tokens)] // Remove duplicates
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`\n✅ Successfully sent ${response.successCount} notifications.`);
    if (response.failureCount > 0) {
      console.log(`❌ Failed to send ${response.failureCount} notifications.`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`   Error for token at index ${idx}:`, resp.error);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error sending notification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

sendTargetedNotification();
