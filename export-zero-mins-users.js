import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';

// Load environment variables
config();

async function exportZeroMinsUsers() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Fetching users with 0 progress...');
    
    // Find users where chaptersProgress doesn't exist or is an empty array
    // Exclude guests if necessary, but we'll export all for now
    const users = await User.find({
      $or: [
        { chaptersProgress: { $exists: false } },
        { chaptersProgress: { $size: 0 } }
      ]
    }).sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('❌ No users found with 0 progress.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users with 0 progress. Generating CSV...`);

    // Prepare CSV Header
    const csvHeader = 'Name,Phone,Email,Platform,Registered At,FCM Token Available\n';
    
    // Format rows
    const csvRows = users.map(user => {
      const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : 'Unknown';
      const phone = user.phone ? `"${user.phone}"` : 'N/A';
      const email = user.email ? `"${user.email}"` : 'N/A';
      const platform = user.platform || 'unknown';
      const registeredAt = user.createdAt ? `"${user.createdAt.toISOString()}"` : 'N/A';
      const hasToken = user.fcmToken ? 'Yes' : 'No';
      
      return `${name},${phone},${email},${platform},${registeredAt},${hasToken}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const filename = 'zero_mins_users.csv';

    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`✅ Successfully exported ${users.length} users to ${filename}`);
    
  } catch (error) {
    console.error('❌ Error exporting users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

exportZeroMinsUsers();
