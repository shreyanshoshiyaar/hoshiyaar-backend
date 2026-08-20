import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

const removeChapter = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const result = await Chapter.deleteOne({ title: 'Adolescence: A Stage of Growth and Change (Coming Soon)' });
    
    if (result.deletedCount > 0) {
      console.log('✅ Successfully removed the chapter: "Adolescence: A Stage of Growth and Change (Coming Soon)"');
    } else {
      // Maybe the title has a slight variation? Try a regex match
      const fallbackResult = await Chapter.deleteOne({ title: { $regex: /Adolescence: A Stage of Growth and Change/, $options: 'i' } });
      if (fallbackResult.deletedCount > 0) {
        console.log('✅ Successfully removed the chapter using flexible matching.');
      } else {
        console.log('❌ Could not find the chapter. It might have already been deleted.');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

removeChapter();
