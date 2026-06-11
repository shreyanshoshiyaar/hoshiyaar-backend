import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const boards = await db.collection('boards').find({}).toArray();
    
    const result = [];
    
    for (const board of boards) {
      const classLevels = await db.collection('classlevels').find({ boardId: board._id }).sort({ order: 1 }).toArray();
      const boardObj = { board: board.name, classes: [] };
      
      for (const cls of classLevels) {
        const subjects = await db.collection('subjects').find({ classId: cls._id }).toArray();
        const clsObj = { class: cls.name, subjects: [] };
        
        for (const sub of subjects) {
          const chapters = await db.collection('chapters').find({ subjectId: sub._id }).sort({ order: 1 }).toArray();
          const chapterData = [];
          for (const c of chapters) {
            const units = await db.collection('units').find({ chapterId: c._id }).sort({ order: 1 }).toArray();
            const unitData = [];
            for (const u of units) {
              const modules = await db.collection('modules').find({ unitId: u._id }).sort({ order: 1 }).toArray();
              unitData.push({
                unit: u.title,
                lessons: modules.map(m => m.title)
              });
            }
            chapterData.push({
              chapter: c.title,
              units: unitData
            });
          }
          clsObj.subjects.push({
            subject: sub.name,
            chapters: chapterData
          });
        }
        boardObj.classes.push(clsObj);
      }
      result.push(boardObj);
    }
    
    const fs = await import('fs');
    fs.writeFileSync('structure.json', JSON.stringify(result, null, 2));
    console.log("Done. Saved to structure.json");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
