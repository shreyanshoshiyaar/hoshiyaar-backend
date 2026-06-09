import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const removeEduvateClass7 = async () => {
  try {
    const mongoURI = 'mongodb+srv://admin:admin123@cluster0.p710204.mongodb.net/hoshiyaar';
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const Board = mongoose.connection.collection('boards');
    const ClassLevel = mongoose.connection.collection('classlevels');

    // Find Eduvate board
    const eduvate = await Board.findOne({ name: 'Eduvate' });
    if (!eduvate) {
      console.log('Eduvate board not found.');
      return;
    }
    console.log('Found Eduvate Board:', eduvate._id);

    // Delete Class 7 for Eduvate
    const result = await ClassLevel.deleteMany({ boardId: eduvate._id, name: '7' });
    console.log('Deleted Class 7 for Eduvate:', result.deletedCount);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
};

removeEduvateClass7();
