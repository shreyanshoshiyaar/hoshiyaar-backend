import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

// Fisher-Yates shuffle
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

const shuffleMCQs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const chapterTitle = 'Chapter 3: Electricity: Circuits and their Components';
    
    // Find the chapter
    const chapter = await Chapter.findOne({ title: { $regex: new RegExp(chapterTitle, 'i') } });
    if (!chapter) {
      console.log(`Chapter not found: ${chapterTitle}`);
      return;
    }
    console.log(`Found Chapter: ${chapter.title}`);

    // Find all modules in this chapter
    const modules = await Module.find({ chapterId: chapter._id });
    const moduleIds = modules.map(m => m._id);
    console.log(`Found ${modules.length} modules in this chapter.`);

    // Find all MCQ curriculum items in these modules
    const mcqItems = await CurriculumItem.find({
      moduleId: { $in: moduleIds },
      type: 'multiple-choice'
    });

    console.log(`Found ${mcqItems.length} MCQ items to shuffle.`);

    let updatedCount = 0;

    for (const item of mcqItems) {
      let modified = false;

      // Shuffle text options
      if (item.options && item.options.length > 1) {
        const original = [...item.options];
        item.options = shuffle([...item.options]);
        // Simple check if it actually changed order
        if (JSON.stringify(original) !== JSON.stringify(item.options)) {
          modified = true;
        }
      }

      // Shuffle image options if present
      if (item.images && item.images.length > 1 && (!item.options || item.options.length === 0)) {
        const originalImages = [...item.images];
        item.images = shuffle([...item.images]);
        if (JSON.stringify(originalImages) !== JSON.stringify(item.images)) {
          modified = true;
        }
      }

      if (modified) {
        await item.save();
        updatedCount++;
      }
    }

    console.log(`Successfully shuffled options for ${updatedCount} MCQ items.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

shuffleMCQs();
