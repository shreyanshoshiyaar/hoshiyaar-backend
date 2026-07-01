import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import { initFirebase } from './services/notificationService.js';
import admin from 'firebase-admin';

// Load environment variables
config();

const TITLE = "Time for today's adventure!";
const BODY = "One lesson. Every day. That’s how real learning happens. Complete today’s lesson now! 🚀";
const ACTION_URL = "/learn"; // Journey page

async function sendMassNotification() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize Firebase
    initFirebase();

    console.log('Fetching users with push tokens...');
    const users = await User.find({ fcmToken: { $ne: null } }, 'name fcmToken');
    
    if (users.length === 0) {
      console.log('❌ No users found with registered push tokens.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users with push tokens. Preparing to send...`);

    // Extract just the valid tokens
    const tokens = users.map(u => u.fcmToken).filter(t => t && t.length > 10);

    if (tokens.length === 0) {
      console.log('❌ No valid tokens found after filtering.');
      process.exit(0);
    }

    // Firebase sendMulticast can handle up to 500 tokens per batch
    const batches = [];
    const BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      batches.push(tokens.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failureCount = 0;

    for (const [index, batch] of batches.entries()) {
      console.log(`Sending batch ${index + 1} of ${batches.length} (${batch.length} tokens)...`);
      
      const message = {
        notification: {
          title: TITLE,
          body: BODY
        },
        data: {
          url: ACTION_URL // Custom data field your frontend router can intercept
        },
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
      
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Handle failures (e.g., tokens that are no longer valid)
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
          }
        });
        
        console.log(`Cleaning up ${failedTokens.length} invalid tokens from the database...`);
        await User.updateMany(
          { fcmToken: { $in: failedTokens } },
          { $set: { fcmToken: null } }
        );
      }
    }

    console.log('\n=====================================');
    console.log('📢 MASS NOTIFICATION SUMMARY');
    console.log('=====================================');
    console.log(`Title: "${TITLE}"`);
    console.log(`Body: "${BODY}"`);
    console.log(`Deep Link: ${ACTION_URL}`);
    console.log('-------------------------------------');
    console.log(`✅ Successfully delivered: ${successCount}`);
    console.log(`❌ Failed (cleaned up): ${failureCount}`);
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

sendMassNotification();
