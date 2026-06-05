import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function makeAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phones = ['9867735936', '7045538721'];
    
    for (const phone of phones) {
      const user = await User.findOne({ phone: phone });
      if (!user) {
        console.log(`User ${phone} not found in database. Skipping.`);
        continue;
      }
      
      user.role = 'admin';
      
      // Ensure they have a username and DOB just in case they need to log in manually via the admin portal
      if (!user.username) {
        user.username = `admin_${phone.substring(6)}`; // Example: admin_8721
      }
      if (!user.dateOfBirth) {
        user.dateOfBirth = '2000-01-01'; // 01/01/2000 in frontend DD/MM/YYYY
      }
      
      await user.save();
      
      console.log(`✅ User ${phone} upgraded to ADMIN successfully!`);
      console.log(`   -> Username: ${user.username}`);
      console.log(`   -> DOB: 01/01/2000\n`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmins();
