import { config } from 'dotenv';
import mongoose from 'mongoose';
import SystemSettings from './models/SystemSettings.js';

config();

async function inspectExamConfig() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const configs = await SystemSettings.find({ key: { $regex: /^exam_config_/ } });
    
    if (configs.length > 0) {
      console.log('Sample exam_config_:');
      console.log(JSON.stringify(configs[0].value, null, 2));
    } else {
      console.log('No exam_config_ found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
inspectExamConfig();
