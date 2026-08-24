import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const countUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const total0MinUsers = await usersCollection.countDocuments({
      whatsappOptIn: true,
      phone: { $ne: null },
      $or: [
        { chaptersProgress: { $exists: false } },
        { chaptersProgress: { $size: 0 } }
      ]
    });

    const pending0MinUsers = await usersCollection.countDocuments({
      whatsappOptIn: true,
      phone: { $ne: null },
      'whatsappNudges.noModule30mSent': false,
      $or: [
        { chaptersProgress: { $exists: false } },
        { chaptersProgress: { $size: 0 } }
      ]
    });

    console.log(`\n=== 0-MIN USER STATS ===`);
    console.log(`Total 0-min users (signed up but never started a module): ${total0MinUsers}`);
    console.log(`Pending 0-min users (haven't received the WhatsApp nudge yet): ${pending0MinUsers}`);
    console.log(`========================\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

countUsers();
