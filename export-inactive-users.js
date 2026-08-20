import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function exportUsers() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const cutoffDate = new Date('2026-07-20T00:00:00.000Z');
    
    console.log(`Fetching users whose last active status is before ${cutoffDate.toISOString()}...`);
    const users = await User.find({ lastActiveAt: { $lt: cutoffDate } }).lean();
    
    console.log(`Found ${users.length} inactive users.`);

    if (users.length === 0) {
      console.log("No users found. Exiting.");
      process.exit(0);
    }

    const headers = ['User ID', 'Name', 'Phone', 'Class', 'Last Active'];
    const rows = users.map(user => {
      const name = user.name ? user.name.replace(/,/g, '') : 'N/A';
      const phone = user.phone || 'N/A';
      const classLevel = user.classLevel || 'N/A';
      const lastActive = user.lastActiveAt ? user.lastActiveAt.toISOString() : 'Never';
      
      return `"${user._id}","${name}","${phone}","${classLevel}","${lastActive}"`;
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const outputPath = path.join(__dirname, 'inactive_users_before_july20.csv');
    
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    
    console.log(`✅ Successfully exported to ${outputPath}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

exportUsers();
