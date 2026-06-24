import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from './models/User.js';
import { initFirebase, sendPushNotification } from './services/notificationService.js';

config();

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    initFirebase();

    const userEmail = 'cg.akshitravula2025@gmail.com';
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.error('User not found with email:', userEmail);
      process.exit(1);
    }

    if (!user.fcmToken) {
      console.error('User found, but has no fcmToken.');
      process.exit(1);
    }

    console.log('Sending notification to:', user.name || 'Learner', 'Token:', user.fcmToken);

    const title = 'Ready for your next adventure?';
    const body = `Hi ${user.name || 'Learner'}! It's been 1 day. Your story is waiting for you. Let's solve the next Science mystery!`;

    const response = await sendPushNotification(user.fcmToken, title, body, { type: 'manual_nudge' });

    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
