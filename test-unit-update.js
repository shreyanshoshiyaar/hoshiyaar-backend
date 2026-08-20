import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Unit from './models/Unit.js';
import Chapter from './models/Chapter.js';

dotenv.config();

const testUnitUpdate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find any draft chapter (isPublished: false)
    const draftChapter = await Chapter.findOne({ isPublished: false });
    if (!draftChapter) {
      console.log('No draft chapters found');
      return;
    }
    console.log(`Found draft chapter: ${draftChapter.title}`);

    // Find a unit for this chapter
    const unit = await Unit.findOne({ chapterId: draftChapter._id });
    if (!unit) {
      console.log('No units found for this draft chapter');
      return;
    }
    console.log(`Found unit: ${unit.title} (timelineBgUrl: ${unit.timelineBgUrl})`);

    // Try updating it
    const updatedUnit = await Unit.findByIdAndUpdate(
      unit._id,
      { $set: { timelineBgUrl: 'https://example.com/test.jpg' } },
      { new: true }
    );
    console.log(`Updated unit timelineBgUrl: ${updatedUnit.timelineBgUrl}`);

    // Verify it saved
    const verifyUnit = await Unit.findById(unit._id);
    console.log(`Verified unit timelineBgUrl from DB: ${verifyUnit.timelineBgUrl}`);

    // Revert it
    await Unit.findByIdAndUpdate(
      unit._id,
      { $set: { timelineBgUrl: unit.timelineBgUrl } },
      { new: true }
    );
    console.log(`Reverted unit timelineBgUrl`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

testUnitUpdate();
