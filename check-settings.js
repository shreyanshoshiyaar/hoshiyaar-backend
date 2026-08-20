import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await mongoose.connection.collection('systemsettings').updateOne(
            { key: 'min_android_version' }, 
            { $set: { value: 41 } }
        );
        console.log('Successfully updated min_android_version to 41!');
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
run();
