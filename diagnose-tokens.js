import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import { initFirebase } from './services/notificationService.js';
import admin from 'firebase-admin';

config();

async function diagnoseTokens() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    initFirebase();

    const users = await User.find({ fcmToken: { $ne: null } }, 'name fcmToken');
    console.log(`Currently found ${users.length} users with push tokens in the database.`);

    if (users.length === 0) {
      console.log('No tokens to test.');
      process.exit(0);
    }

    const tokens = users.map(u => u.fcmToken).filter(t => t && t.length > 10);
    
    // We will do a dry-run or send a silent data message to test the tokens without alerting users
    const message = {
      data: { ping: "test" },
      tokens: tokens
    };

    console.log(`Testing ${tokens.length} tokens...`);
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`\n--- FIREBASE RESPONSE ANALYSIS ---`);
    console.log(`Success: ${response.successCount}`);
    console.log(`Failure: ${response.failureCount}`);
    
    const errorCounts = {};
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code || 'Unknown Error';
        errorCounts[errCode] = (errorCounts[errCode] || 0) + 1;
        // Print the first few detailed errors
        if (idx < 5) {
          console.log(`[Token ${idx}] Failed: ${errCode} - ${resp.error?.message}`);
        }
      }
    });

    console.log('\n--- ERROR SUMMARY ---');
    console.table(errorCounts);

    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

diagnoseTokens();
