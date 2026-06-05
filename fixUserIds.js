import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import User from './models/User.js';
import Subject from './models/Subject.js';
import ClassLevel from './models/ClassLevel.js';

dotenv.config();

async function fixUserIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phone = '7045538721';
    const user = await User.findOne({ phone: phone });
    if (!user) {
      console.log('User not found.');
      process.exit(1);
    }

    const boardName = 'Eduvate (CBSE)';
    const className = '6';
    const subjectName = 'Science';

    const board = await Board.findOne({ name: boardName });
    if (!board) {
      console.log(`Board ${boardName} not found. Available boards:`);
      const boards = await Board.find();
      console.log(boards.map(b => b.name));
    } else {
      user.boardId = board._id;
      user.board = boardName;
      console.log('Set boardId to', board._id);
      
      const classLevel = await ClassLevel.findOne({ boardId: board._id, name: className });
      if (classLevel) {
        user.classId = classLevel._id;
        user.classLevel = className;
        console.log('Set classId to', classLevel._id);
        
        const subject = await Subject.findOne({ boardId: board._id, classId: classLevel._id, name: subjectName });
        if (subject) {
          user.subjectId = subject._id;
          user.subject = subjectName;
          console.log('Set subjectId to', subject._id);
        } else {
          console.log(`Subject ${subjectName} not found in this class/board. Available subjects for class ${className}:`);
          const subjects = await Subject.find({ boardId: board._id, classId: classLevel._id });
          console.log(subjects.map(s => s.name));
        }
      } else {
        console.log(`Class ${className} not found in this board. Available classes for ${boardName}:`);
        const classes = await ClassLevel.find({ boardId: board._id });
        console.log(classes.map(c => c.name));
      }
    }
    
    await user.save();
    console.log('User IDs updated.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixUserIds();
