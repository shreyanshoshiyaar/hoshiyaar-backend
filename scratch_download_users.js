import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const fetchUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find users who have received ANY whatsapp nudge
    const users = await usersCollection.find({
      $or: [
        { 'whatsappNudges.noModule30mSent': true },
        { 'whatsappNudges.startedNotCompleted2hSent': true },
        { 'whatsappNudges.inactive24hSent': true },
        { 'whatsappNudges.inactive3DaysSent': true }
      ]
    }).toArray();

    console.log(`Found ${users.length} users.`);

    // Convert to CSV
    let csv = 'Name,Phone,Email,Class Level,School,City,Region,Platform,Created At,Total Points,0-Min Nudge,Mission Incomplete,Streak Break,3-Days Inactive\n';
    
    users.forEach(user => {
      const escapeCsv = (str) => {
        if (!str) return '""';
        const stringified = String(str);
        if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
          return `"${stringified.replace(/"/g, '""')}"`;
        }
        return stringified;
      };

      const row = [
        escapeCsv(user.name),
        escapeCsv(user.phone),
        escapeCsv(user.email),
        escapeCsv(user.classLevel),
        escapeCsv(user.school),
        escapeCsv(user.city),
        escapeCsv(user.region),
        escapeCsv(user.platform),
        escapeCsv(user.createdAt ? new Date(user.createdAt).toISOString() : ''),
        escapeCsv(user.totalPoints),
        user.whatsappNudges?.noModule30mSent ? 'Yes' : 'No',
        user.whatsappNudges?.startedNotCompleted2hSent ? 'Yes' : 'No',
        user.whatsappNudges?.inactive24hSent ? 'Yes' : 'No',
        user.whatsappNudges?.inactive3DaysSent ? 'Yes' : 'No'
      ].join(',');
      
      csv += row + '\n';
    });

    const outputPath = path.resolve(process.cwd(), 'whatsapp_nudged_users.csv');
    fs.writeFileSync(outputPath, csv);
    
    console.log(`✅ CSV generated successfully at: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fetchUsers();
