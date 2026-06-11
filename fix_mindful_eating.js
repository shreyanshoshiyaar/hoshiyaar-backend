import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';
import axios from 'axios';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // 1. Delete the incorrect uppercase chapter and all its contents
    const badChapter = await db.collection('chapters').findOne({ title: 'Chapter 3: Mindful eating - A Path to a Healthy Body' });
    if (badChapter) {
      console.log('Found uppercase chapter. Deleting...');
      const units = await db.collection('units').find({ chapterId: badChapter._id }).toArray();
      const unitIds = units.map(u => u._id);
      
      const modules = await db.collection('modules').find({ chapterId: badChapter._id }).toArray();
      const moduleIds = modules.map(m => m._id);
      
      await db.collection('curriculumitems').deleteMany({ moduleId: { $in: moduleIds } });
      await db.collection('defaultrevisionquestions').deleteMany({ moduleId: { $in: moduleIds } });
      await db.collection('modules').deleteMany({ chapterId: badChapter._id });
      await db.collection('units').deleteMany({ chapterId: badChapter._id });
      await db.collection('chapters').deleteOne({ _id: badChapter._id });
      console.log('Uppercase chapter and all associated data deleted.');
    }

    // 2. Upload the HOT module from the CBSE CSV to the correct lowercase chapter
    const cfg = {
      path: "D:\\Mindful eating - A path to a healthy body - CBSE - final - 5th June.csv",
      board: "CBSE", cls: "6", sub: "Science",
      chKey: 'CBSE chapter title', unKey: 'CBSE Unit Title', lesKey: 'Lesson Title',
      typeKey: 'Question Type', textKey: 'Concept', qKey: 'Questions', optKey: 'Options', ansKey: 'Answer', revKey: 'Revision'
    };
    
    const content = fs.readFileSync(cfg.path, 'utf8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    
    const hotRows = parsed.data.filter(r => {
      const title = String(r[cfg.lesKey] || '').trim();
      return /hot module|difficult module/i.test(title);
    });

    const unitsMap = {};
    for (const row of hotRows) {
      let un = String(row[cfg.unKey] || '').trim();
      if (!un) un = "Default Unit";
      
      let ch = "Chapter 3: Mindful eating - A path to a healthy body"; // FORCE LOWERCASE
      
      if (!unitsMap[un]) unitsMap[un] = { chapter: ch, concepts: [], lesson_title: String(row[cfg.lesKey] || '').trim() };
      
      const typeRaw = String(row[cfg.typeKey] || '').trim();
      let mappedType = typeRaw.toLowerCase();
      if (mappedType === 'mcq') mappedType = 'mcq';
      if (mappedType === 'fib') mappedType = 'fillups';
      if (mappedType === 're-arrange') mappedType = 'rearrange';
      if (mappedType === 'comic') mappedType = 'comic';
      if (mappedType === 'concept') mappedType = 'concept';
      
      let optionsRaw = String(row[cfg.optKey] || '').trim();
      let options = [];
      if (optionsRaw) options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
      
      const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
      const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
      
      unitsMap[un].concepts.push({
        type: mappedType,
        text: String(row[cfg.textKey] || '').trim(),
        question: String(row[cfg.qKey] || '').trim(),
        options: options,
        words: (mappedType === 'rearrange') ? options : undefined,
        answer: String(row[cfg.ansKey] || '').trim(),
        revise: String(row[cfg.revKey] || '').trim(),
        imageUrl: images[0] || '',
        images
      });
    }

    for (const [unitTitle, data] of Object.entries(unitsMap)) {
      const payload = {
        board_title: cfg.board,
        class_title: cfg.cls,
        subject_title: cfg.sub,
        chapter_title: data.chapter,
        unit_title: unitTitle,
        replace: true,
        lessons: [
          {
            lesson_title: data.lesson_title || "HOT MODULE",
            concepts: data.concepts
          }
        ]
      };

      console.log(`Uploading to ${data.chapter} > ${unitTitle}`);
      try {
        const res = await axios.post('http://localhost:5000/api/curriculum/import', payload);
        console.log(`Success:`, res.data.importedItems, "items imported.");
      } catch (err) {
        console.error(`Error uploading:`, err.response?.data || err.message);
      }
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
