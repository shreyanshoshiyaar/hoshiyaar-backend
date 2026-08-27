import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';
import SystemSettings from './models/SystemSettings.js';
import Chapter from './models/Chapter.js';

config();

async function uploadExamConfig() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide the path to the CSV file. Example: node upload_exam_config_csv.js exam.csv");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      
      // Group by chapter
      const chapterConfigs = {};
      
      for (const row of results) {
         const chapterTitle = row['Chapter_title']?.replace(/\n/g, ' ')?.replace(/\r/g, '')?.trim();
         if (!chapterTitle) continue;
         
         if (!chapterConfigs[chapterTitle]) {
             chapterConfigs[chapterTitle] = {
                 subjectKnowledge: row['subject_knowledge']?.trim() || '', // Leaving this in case they add it later
                 revisionCards: [],
                 questions: [],
                 mcqs: [],
                 flowItems: []
             };
         }
         
         if (row['subject_knowledge'] && row['subject_knowledge'].trim()) {
             chapterConfigs[chapterTitle].subjectKnowledge = row['subject_knowledge'].trim();
         }
         
         const type = row['Type']?.trim().toLowerCase();
         if (type === 'revise' && row['Revise image']) {
             const content = row['Revise image'].trim();
             chapterConfigs[chapterTitle].revisionCards.push(content);
             chapterConfigs[chapterTitle].flowItems.push({ type: 'revision_card', content });
         } else if (type === 'descriptive' && row['Question']) {
             const question = {
                 text: row['Question'].trim(),
                 expected: row['Answer Descriptive']?.trim() || ''
             };
             chapterConfigs[chapterTitle].questions.push(question);
             chapterConfigs[chapterTitle].flowItems.push({ type: 'descriptive_question', ...question });
         } else if (type === 'mcq' && row['Question'] && row['Option MCQ']) {
             const mcq = {
                 text: row['Question'].trim(),
                 options: row['Option MCQ'].split(',').map(o => o.trim()).filter(o => o),
                 expected: row['MCQ answer']?.trim() || ''
             };
             chapterConfigs[chapterTitle].mcqs.push(mcq);
             chapterConfigs[chapterTitle].flowItems.push({ type: 'mcq', ...mcq });
         }
      }
      
      // Process each chapter
      for (const [title, config] of Object.entries(chapterConfigs)) {
          // Find chapter ID
          const chapter = await Chapter.findOne({ title: title });
          if (!chapter) {
              console.error(`❌ Chapter not found in DB: "${title}". Skipping...`);
              continue;
          }
          
          const settingKey = `exam_config_${chapter._id.toString()}`;
          
          await SystemSettings.findOneAndUpdate(
              { key: settingKey },
              { 
                  key: settingKey,
                  value: config
              },
              { upsert: true, new: true }
          );
          
          console.log(`✅ Uploaded Exam Config for Chapter: "${title}"`);
          console.log(`   - Total Items in Flow: ${config.flowItems.length}`);
      }
      
      console.log("\nFinished uploading exam configurations!");
      await mongoose.disconnect();
      process.exit(0);
    });
}

uploadExamConfig();
