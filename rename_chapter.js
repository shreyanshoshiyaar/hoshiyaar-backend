import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const res = await db.collection('chapters').updateOne(
      { title: "Chapter 15: Exploring Substances: Acidic, Basic, and Neutral" },
      { $set: { title: "Chapter 2: Exploring Substances: Acidic, Basic, and Neutral" } }
    );
    
    if (res.modifiedCount > 0) {
      console.log("Successfully renamed the chapter to 'Chapter 2: Exploring Substances: Acidic, Basic, and Neutral'.");
    } else {
      console.log("Could not find the chapter to rename. Maybe it was already renamed?");
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
