import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';

config();

async function exportZeroMinNudges() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Fetching users who received the 0-min nudge...');
    
    const users = await User.find({
      'whatsappNudges.noModule30mSent': true
    }).sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('❌ No users found.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users. Generating CSV...`);

    const csvHeader = 'Username,Name,Phone,Email,Platform,Registered At,Converted (Started Module)\n';
    
    const csvRows = users.map(user => {
      const username = user.username ? `"${user.username.replace(/"/g, '""')}"` : 'N/A';
      const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : 'Unknown';
      const phone = user.phone ? `"${user.phone}"` : 'N/A';
      const email = user.email ? `"${user.email}"` : 'N/A';
      const platform = user.platform || 'unknown';
      const registeredAt = user.createdAt ? `"${user.createdAt.toISOString()}"` : 'N/A';
      
      const converted = (user.chaptersProgress && user.chaptersProgress.length > 0) ? 'Yes' : 'No';
      
      return `${username},${name},${phone},${email},${platform},${registeredAt},${converted}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const filename = '0_min_nudges_sent.csv';

    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`✅ Successfully exported ${users.length} users to ${filename}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

exportZeroMinNudges();
