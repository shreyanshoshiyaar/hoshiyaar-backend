import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chapter = await Chapter.findOne({ title: { $regex: /Pressure, Winds, Storms, and Cyclones/i } });
    if (!chapter) {
      console.log('Chapter not found.');
    } else {
      console.log(`Deleting chapter: ${chapter.title}`);
      
      const modules = await Module.find({ chapterId: chapter._id });
      const moduleIds = modules.map(m => m._id);

      const itemsDel = await CurriculumItem.deleteMany({ moduleId: { $in: moduleIds } });
      console.log(`Deleted ${itemsDel.deletedCount} items.`);

      const modDel = await Module.deleteMany({ chapterId: chapter._id });
      console.log(`Deleted ${modDel.deletedCount} modules.`);

      const unitDel = await Unit.deleteMany({ chapterId: chapter._id });
      console.log(`Deleted ${unitDel.deletedCount} units.`);

      await Chapter.deleteOne({ _id: chapter._id });
      console.log('Deleted chapter.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
