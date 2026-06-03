import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import ClassLevel from './models/ClassLevel.js';
import Board from './models/Board.js';

dotenv.config();

async function checkSubject() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const subject = await Subject.findById('69d8dcff196175f4c13220fc');
        if (!subject) {
            console.log("Subject not found.");
            process.exit(0);
        }
        console.log(`Subject: ${subject.name}`);
        const classLevel = await ClassLevel.findById(subject.classId);
        console.log(`Class: ${classLevel ? classLevel.name : 'Unknown'}`);
        if (classLevel) {
            const board = await Board.findById(classLevel.boardId);
            console.log(`Board: ${board ? board.name : 'Unknown'}`);
        }
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}
checkSubject();
