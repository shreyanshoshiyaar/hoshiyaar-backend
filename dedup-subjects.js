import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import User from './models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Group all subjects by boardId, classId, and name
  const subjects = await Subject.find();
  const groups = {};

  for (const sub of subjects) {
      const key = `${sub.boardId}_${sub.classId}_${sub.name.toLowerCase().trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
  }

  let deletedCount = 0;
  let remappedCount = 0;

  for (const key in groups) {
      const duplicates = groups[key];
      if (duplicates.length > 1) {
          console.log(`\n⚠️ Found ${duplicates.length} duplicate subjects for '${duplicates[0].name}'`);
          // Keep the first one, delete the rest
          const keepSubject = duplicates[0];
          const removeSubjects = duplicates.slice(1);

          for (const removeSub of removeSubjects) {
              // 1. Remap all chapters belonging to the duplicate subject
              const chapters = await Chapter.find({ subjectId: removeSub._id });
              for (const ch of chapters) {
                  ch.subjectId = keepSubject._id;
                  await ch.save();
                  remappedCount++;
              }

              // 2. Remap any users pointing to this subjectId
              const users = await User.find({ subjectId: removeSub._id });
              for (const u of users) {
                  u.subjectId = keepSubject._id;
                  await u.save();
              }

              // 3. Delete the duplicate subject
              await Subject.findByIdAndDelete(removeSub._id);
              deletedCount++;
              console.log(`   🧹 Deleted duplicate subject ID: ${removeSub._id}`);
          }
      }
  }

  console.log(`\n🎉 Deduplication complete! Remapped ${remappedCount} chapters and deleted ${deletedCount} duplicate subjects.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
