import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://hoshiyaar:N1g5yYd2p1v31A1q@hoshiyaar-cluster.szzd98d.mongodb.net/hoshiyaar?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to DB');
        
        const testUser = await User.findOne({ phone: { $ne: null } });
        if (!testUser) {
            console.log('No users with phone found');
            process.exit(0);
        }
        
        console.log('Found user:', testUser.username, testUser.phone);
        
        testUser.password = 'newpassword123';
        await testUser.save();
        console.log('Successfully saved user with new password');
        
    } catch (err) {
        console.error('Error during save:', err);
    } finally {
        mongoose.disconnect();
    }
};

run();
