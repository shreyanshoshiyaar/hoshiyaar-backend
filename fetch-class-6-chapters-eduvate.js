import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';
import ClassLevel from './models/ClassLevel.js';
import Board from './models/Board.js';

dotenv.config();

const sortChapters = (chapters) => {
  return chapters.sort((a, b) => {
    const titleA = a.title || '';
    const titleB = b.title || '';
    const aSoon = titleA.includes('(Coming Soon)');
    const bSoon = titleB.includes('(Coming Soon)');
    if (aSoon && !bSoon) return 1;
    if (!aSoon && bSoon) return -1;
    const getNum = (t) => {
      const m = t.match(/Chapter\s+(\d+)/i);
      return m ? parseInt(m[1], 10) : 999999;
    };
    const numA = getNum(titleA);
    const numB = getNum(titleB);
    if (numA !== numB) return numA - numB;
    return (a.order || 0) - (b.order || 0);
  });
};

const fetchClass6EduvateChapters = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const board = await Board.findOne({ name: { $regex: /Eduvate/i } });
    if (!board) throw new Error('Board Eduvate not found');

    const cls = await ClassLevel.findOne({ boardId: board._id, name: '6' });
    if (!cls) throw new Error('Class 6 not found');

    const subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: 'Science' });
    if (!subject) throw new Error('Subject Science not found for Eduvate Class 6');

    const chapters = await Chapter.find({ subjectId: subject._id }).lean();
    console.log(`\nFound ${chapters.length} raw chapters. Sorting them with the new logic...\n`);

    const sorted = sortChapters(chapters);

    sorted.forEach((ch, idx) => {
      console.log(`${idx + 1}. [Order: ${ch.order}] ${ch.title}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

fetchClass6EduvateChapters();
