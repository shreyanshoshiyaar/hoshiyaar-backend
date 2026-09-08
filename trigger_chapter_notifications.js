import mongoose from 'mongoose';
import { config } from 'dotenv';
import { initFirebase, sendChapterNotificationsForSlot } from './services/notificationService.js';

config();

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const slotArg = args.find(a => a.startsWith('--slot='));
  const slot = slotArg ? slotArg.split('=')[1].toLowerCase() : '7pm';

  console.log(`\n🚀 Triggering Chapter Notifications: Slot = ${slot.toUpperCase()}, Dry-Run = ${isDryRun}`);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    initFirebase();

    const result = await sendChapterNotificationsForSlot(slot, isDryRun);
    console.log('🎉 Execution Result:', result);
  } catch (error) {
    console.error('❌ Error executing chapter notifications:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
