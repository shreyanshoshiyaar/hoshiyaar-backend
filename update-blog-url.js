import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from './models/Blog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function updateBlogUrl() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    await mongoose.connect(mongoURI);
    
    // Find a blog related to clinical vs laboratory thermometer
    const blog = await Blog.findOne({
      $or: [
        { slug: /clinical-vs-laboratory-thermometer/i },
        { title: /clinical.*laboratory.*thermometer/i }
      ]
    });

    if (blog) {
      blog.category = 'temperature';
      if (!blog.tags || blog.tags.length === 0) {
        blog.tags = ["Class 6 Science", "CBSE", "Temperature", "Thermometer"];
      } else if (!blog.tags.includes("Thermometer")) {
        blog.tags.push("Temperature", "Thermometer");
      }
      blog.slug = 'clinical-vs-laboratory-thermometer';
      await blog.save();
      console.log(`✅ Successfully updated the URL for blog: ${blog.title}`);
      console.log(`New URL will be: /blogs/temperature/clinical-vs-laboratory-thermometer`);
      console.log(`Tags have been updated to: ${blog.tags.join(', ')}`);
    } else {
      console.log('❌ Could not find a blog matching clinical-vs-laboratory-thermometer.');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error updating blog:', error);
    mongoose.connection.close();
  }
}

updateBlogUrl();
