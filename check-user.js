import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ClassLevel from './models/ClassLevel.js';

dotenv.config();

async function inspectUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ username: { $regex: /akshitravula/i } });
    if (!user) {
        console.log("User not found");
    } else {
        console.log(`User: ${user.username}, classLevel: ${user.classLevel}`);
        if (user.classId) {
            const cls = await ClassLevel.findById(user.classId);
            console.log(`User classId points to: ${cls ? cls.name : 'Unknown'}`);
        } else {
            console.log('User has no classId set');
        }
    }
  } catch(e) {
      console.log(e);
  } finally {
      process.exit(0);
  }
}
inspectUser();
