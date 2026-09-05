import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';
import SystemSettings from './models/SystemSettings.js';
import Chapter from './models/Chapter.js';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';

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
      
      // Group by chapter identifier (Board + Class + Subject + Chapter_title)
      const chapterConfigs = {};
      
      for (const row of results) {
         const chapterTitle = row['Chapter_title']?.replace(/\n/g, ' ')?.replace(/\r/g, '')?.trim();
         const boardName = row['Board']?.trim();
         const className = row['Class']?.trim();
         const subjectName = row['Subject']?.trim();
         
         const groupKey = (boardName && className && subjectName) 
            ? `${boardName}_${className}_${subjectName}_${chapterTitle}` 
            : chapterTitle;
            
         if (!groupKey) continue;
         
         if (!chapterConfigs[groupKey]) {
             chapterConfigs[groupKey] = {
                 title: chapterTitle,
                 board: boardName,
                 classLevel: className,
                 subject: subjectName,
                 subjectKnowledge: row['subject_knowledge']?.trim() || '',
                 revisionCards: [],
                 questions: [],
                 mcqs: [],
                 flowItems: []
             };
         }
         
         if (row['subject_knowledge'] && row['subject_knowledge'].trim()) {
             chapterConfigs[groupKey].subjectKnowledge = row['subject_knowledge'].trim();
         }
         
         const type = row['Type']?.trim().toLowerCase();
         if (type === 'revise' && row['Revise image']) {
             const content = row['Revise image'].trim();
             chapterConfigs[groupKey].revisionCards.push(content);
             chapterConfigs[groupKey].flowItems.push({ type: 'revision_card', content });
         } else if (type === 'descriptive' && row['Question']) {
             const question = {
                 text: row['Question'].trim(),
                 expected: row['Answer Descriptive']?.trim() || ''
             };
             chapterConfigs[groupKey].questions.push(question);
             chapterConfigs[groupKey].flowItems.push({ type: 'descriptive_question', ...question });
         } else if (type === 'mcq' && row['Question'] && row['Option MCQ']) {
             const mcq = {
                 text: row['Question'].trim(),
                 options: row['Option MCQ'].split(',').map(o => o.trim()).filter(o => o),
                 expected: row['MCQ answer']?.trim() || ''
             };
             chapterConfigs[groupKey].mcqs.push(mcq);
             chapterConfigs[groupKey].flowItems.push({ type: 'mcq', ...mcq });
         }
      }
      
      // Process each chapter
      for (const [groupKey, config] of Object.entries(chapterConfigs)) {
          let chapter = null;
          
          // Find chapter by Board -> Class -> Subject -> Chapter Title
          if (config.title && config.board && config.classLevel && config.subject) {
              const boardDoc = await Board.findOne({ name: config.board });
              if (!boardDoc) {
                  console.error(`❌ Board not found: "${config.board}". Skipping chapter "${config.title}"...`);
                  continue;
              }
              
              const classDoc = await ClassLevel.findOne({ name: config.classLevel, boardId: boardDoc._id });
              if (!classDoc) {
                  console.error(`❌ Class not found: "${config.classLevel}" for Board "${config.board}". Skipping...`);
                  continue;
              }
              
              const subjectDoc = await Subject.findOne({ name: config.subject, classId: classDoc._id, boardId: boardDoc._id });
              if (!subjectDoc) {
                  console.error(`❌ Subject not found: "${config.subject}". Skipping...`);
                  continue;
              }
              
              chapter = await Chapter.findOne({ title: config.title, subjectId: subjectDoc._id });
          }
          // Ultimate fallback to just title (Risky)
          else if (config.title) {
              chapter = await Chapter.findOne({ title: config.title });
          }
          
          if (!chapter) {
              console.error(`❌ Chapter not found in DB for "${groupKey}". Skipping...`);
              continue;
          }
          
          if (!(config.board && config.classLevel && config.subject)) {
              console.warn(`⚠️  WARNING: Mapped config to chapter using ONLY title "${config.title}". This is risky if multiple classes have this chapter! Please add 'Board', 'Class', and 'Subject' columns.`);
          }
          
          const settingKey = `exam_config_${chapter._id.toString()}`;
          
          // Remove title, board, classLevel, subject from the stored config since they are only used for processing
          const { title, board, classLevel, subject, ...configToSave } = config;
          
          await SystemSettings.findOneAndUpdate(
              { key: settingKey },
              { 
                  key: settingKey,
                  value: configToSave
              },
              { upsert: true, new: true }
          );
          
          console.log(`✅ Uploaded Exam Config for Chapter: "${chapter.title}" (ID: ${chapter._id})`);
          console.log(`   - Total Items in Flow: ${configToSave.flowItems.length}`);
      }
      
      console.log("\nFinished uploading exam configurations!");
      await mongoose.disconnect();
      process.exit(0);
    });
}

uploadExamConfig();
