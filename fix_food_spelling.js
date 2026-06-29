import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ModuleSchema = new mongoose.Schema({}, { strict: false });
const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);
const ChapterSchema = new mongoose.Schema({}, { strict: false });
const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);

async function fixSpelling() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');

    // The spelling corrections to apply
    const corrections = {
      "Vitamins and its fucntions": "Vitamins and its functions",
      "Minerals and its fucntions": "Minerals and its functions",
      "Different tyoe of minerals": "Different types of minerals",
      "Different tyoe of carbohydrates": "Different types of carbohydrates",
      "Protien and its functions": "Protein and its functions"
    };

    let fixedCount = 0;

    // We can just find any modules that match these misspelled titles globally
    for (const [misspelled, correct] of Object.entries(corrections)) {
      const result = await Module.updateMany(
        { title: misspelled },
        { $set: { title: correct } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Fixed "${misspelled}" -> "${correct}" (${result.modifiedCount} updated)`);
        fixedCount += result.modifiedCount;
      }
    }

    console.log(`\n🎉 Done! Fixed ${fixedCount} spelling mistakes in total.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fixSpelling();
