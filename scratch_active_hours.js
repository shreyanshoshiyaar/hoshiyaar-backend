import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const users = await User.find({ lastActiveAt: { $ne: null } }, 'lastActiveAt username name');
    
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
        hourCounts[i] = 0;
    }

    users.forEach(user => {
        // Convert to IST (UTC + 5.5 hours)
        const date = new Date(user.lastActiveAt);
        date.setMinutes(date.getMinutes() + 330); 
        const hour = date.getUTCHours();
        hourCounts[hour]++;
    });

    console.log("Activity by Hour (IST):");
    for (let i = 0; i < 24; i++) {
        const startHour = i % 12 === 0 ? 12 : i % 12;
        const startAmPm = i < 12 ? 'AM' : 'PM';
        
        const next = (i + 1) % 24;
        const endHour = next % 12 === 0 ? 12 : next % 12;
        const endAmPm = next < 12 ? 'AM' : 'PM';

        const label = `${startHour}:00 ${startAmPm} - ${endHour}:00 ${endAmPm}`;
        console.log(`${label} -> ${hourCounts[i]} users`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
