import mongoose from 'mongoose';
import ClassLevel from './models/ClassLevel.js';
import Board from './models/Board.js';

mongoose.connect('mongodb://127.0.0.1:27017/hoshiyaar').then(async () => {
    const boards = await Board.find();
    console.log('Boards:', boards);
    const classes = await ClassLevel.find();
    console.log('Classes:', classes);
    process.exit();
}).catch(console.error);
