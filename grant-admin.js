import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';
import Module from './models/Module.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const ADMIN_PHONES = ['7021970672', '9867735936'];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Fetch all chapters and their subjects to generate full progress
  const chapters = await Chapter.find();
  const progressMap = new Map(); // key: chapter._id -> value: progress obj

  for (const ch of chapters) {
      const sub = await Subject.findById(ch.subjectId);
      if (!sub) continue;

      const modules = await Module.find({ chapterId: ch._id });
      const moduleIds = modules.map(m => m._id.toString());

      const progressObj = {
          chapter: ch.order || 1,
          subject: sub.name,
          conceptCompleted: true,
          quizCompleted: true,
          completedModules: moduleIds,
          stats: {}
      };

      progressMap.set(ch._id.toString(), progressObj);
  }

  const newProgressArray = Array.from(progressMap.values());

  const users = await User.find({ phone: { $in: ADMIN_PHONES } });

  for (const user of users) {
      user.role = 'admin';
      
      // Merge new complete progress
      user.chaptersProgress = newProgressArray;
      
      // Also give them some points just so it looks good!
      user.totalPoints = 5000;

      await user.save();
      console.log(`✅ Granted Admin & 100% Completion to: ${user.name} (${user.phone})`);
  }

  console.log("\n🎉 Admin setup complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
