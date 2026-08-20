import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');

    const db = mongoose.connection.db;
    
    // Count directly from the raw collection
    const usersCollection = db.collection('users');
    
    const count0min = await usersCollection.countDocuments({ 'whatsappNudges.noModule30mSent': true });
    const count2h = await usersCollection.countDocuments({ 'whatsappNudges.startedNotCompleted2hSent': true });
    const count24h = await usersCollection.countDocuments({ 'whatsappNudges.inactive24hSent': true });
    const count3d = await usersCollection.countDocuments({ 'whatsappNudges.inactive3DaysSent': true });
    
    console.log(`0-Min Nudges (noModule30mSent): ${count0min}`);
    console.log(`Mission Incomplete (startedNotCompleted2hSent): ${count2h}`);
    console.log(`Streak Break (inactive24hSent): ${count24h}`);
    console.log(`3-Days Inactive (inactive3DaysSent): ${count3d}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDB();
