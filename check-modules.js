import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Module from './models/Module.js';

dotenv.config();

async function checkModules() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const mods = await Module.find({ title: { $regex: /Temperature/i } });
    console.log(`\nFound ${mods.length} modules with "Temperature" in their title.`);
    
    if (mods.length === 0) {
        console.log(`\n❌ WARNING: There are literally ZERO temperature modules in the database!`);
        console.log(`This means the CSV files were NEVER actually imported.`);
    } else {
        console.log(`\nHere are some of the modules:`);
        mods.slice(0, 5).forEach(m => console.log(`- ${m.title}`));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

checkModules();
