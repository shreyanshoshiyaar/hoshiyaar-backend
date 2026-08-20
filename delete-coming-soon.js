import 'dotenv/config';
import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema({ title: String }, { strict: false });
const Chapter = mongoose.model('Chapter', ChapterSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const result = await Chapter.deleteMany({ title: { $regex: 'Temperature.*Coming Soon', $options: 'i' } });
    console.log(`Successfully deleted ${result.deletedCount} "Coming Soon" chapter(s).`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

run();
