import mongoose from 'mongoose';
import Blog from './models/Blog.js';
import dotenv from 'dotenv';
dotenv.config();

const blogsToUpdate = [
  { title: "Normal Human Body Temperature: 37°C and 98.6°F Explained | Class 6", date: "2026-06-17T10:00:00Z" },
  { title: "Clinical Thermometer vs Laboratory Thermometer | Class 6 CBSE", date: "2026-06-18T10:00:00Z" },
  { title: "Temperature and Its Measurement Class 6 Notes | CBSE Science", date: "2026-06-19T10:00:00Z" },
  { title: "Important Questions on Temperature and Its Measurement | Class 6 CBSE", date: "2026-06-20T10:00:00Z" },
  { title: "What Is Temperature? Easy Explanation for Class 6", date: "2026-06-21T10:00:00Z" },
  { title: "Difference Between Acid and Base | Class 7 CBSE Science", date: "2026-06-22T10:00:00Z" },
  { title: "Acids, Bases and Salts Class 7 Notes | CBSE Science Chapter 5", date: "2026-06-23T10:00:00Z" },
  { title: "Important Questions on Acids, Bases and Salts | Class 7 CBSE Science", date: "2026-06-24T10:00:00Z" },
  { title: "Indicators in Science: Litmus, Turmeric, China Rose | Class 7 CBSE", date: "2026-06-25T10:00:00Z" },
  { title: "What Are Acids, Bases and Salts? Easy Explanation for Class 7", date: "2026-06-26T10:00:00Z" }
];

async function updateDates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    for (const b of blogsToUpdate) {
      const result = await Blog.findOneAndUpdate(
        { title: b.title },
        { 
          createdAt: new Date(b.date),
          updatedAt: new Date(b.date)
        },
        { new: true }
      );
      if (result) {
        console.log(`Updated: ${b.title} to ${result.createdAt}`);
      } else {
        console.log(`NOT FOUND: ${b.title}`);
      }
    }
    console.log('Done!');
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

updateDates();
