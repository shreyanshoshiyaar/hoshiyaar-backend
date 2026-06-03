import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

async function fixChapters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // Find the Biodiversity chapter (the one we know is visible)
    const bioChapter = await Chapter.findOne({ title: /Diversity in the Living World/i });
    if (!bioChapter) {
        console.log("❌ Could not find Biodiversity chapter. Did it get deleted?");
        process.exit(1);
    }
    console.log(`✅ Found Biodiversity chapter. Subject ID is: ${bioChapter.subjectId}`);

    // Find the Temperature chapter
    const tempChapter = await Chapter.findOne({ title: /Temperature And Thermometer/i });
    if (!tempChapter) {
        console.log("❌ Could not find Temperature chapter. Did the import script run successfully?");
        process.exit(1);
    }

    // Move Temperature chapter into the EXACT SAME subject as Biodiversity
    tempChapter.subjectId = bioChapter.subjectId;
    await tempChapter.save();

    console.log(`🎉 Success! Moved 'Temperature And Thermometer' into the same subject as Biodiversity.`);
    console.log(`They will now appear side-by-side on your Learn Dashboard!`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

fixChapters();
