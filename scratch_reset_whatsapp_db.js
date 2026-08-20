import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('🔄 Wiping all historical WhatsApp nudge data...');

    const result = await usersCollection.updateMany(
      {}, // all documents
      {
        $set: {
          'whatsappNudges.noModule30mSent': false,
          'whatsappNudges.startedNotCompleted2hSent': false,
          'whatsappNudges.inactive24hSent': false,
          'whatsappNudges.inactive3DaysSent': false,
        }
      }
    );
    
    console.log(`✅ Successfully reset WhatsApp nudge tracking for ${result.modifiedCount} users!`);
    console.log('🚀 The Admin Dashboard will now read 0 across all campaigns.');
    console.log('📈 Starting right now, only successfully delivered Meta API messages will be counted.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

resetDB();
