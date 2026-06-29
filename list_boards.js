import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BoardSchema = new mongoose.Schema({}, { strict: false });
const Board = mongoose.models.Board || mongoose.model('Board', BoardSchema);

async function listBoards() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    
    const boards = await Board.find({});
    console.log(`\nFound ${boards.length} Boards in the database:`);
    boards.forEach(b => {
      console.log(`- "${b.name}" (ID: ${b._id})`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

listBoards();
