import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';
import Unit from './models/Unit.js';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const u1 = await Unit.findOne({ title: { $regex: 'Unit 1: Plant Characteristics and Grouping', $options: 'i' } });
    if (u1) {
      const c1 = await DefaultRevisionQuestion.countDocuments({ unitId: u1._id });
      console.log('Unit 1 Revise Count in DB:', c1);
    } else {
      console.log('Unit 1 not found');
    }

    const u2 = await Unit.findOne({ title: { $regex: 'Unit 2: Animal Movement, Habitats, and Adaptations', $options: 'i' } });
    if (u2) {
      const c2 = await DefaultRevisionQuestion.countDocuments({ unitId: u2._id });
      console.log('Unit 2 Revise Count in DB:', c2);
    } else {
      console.log('Unit 2 not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
