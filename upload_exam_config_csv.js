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
         const chapterTitle = (row['Chapter'] || row['Chapter_title'] || row['Chapter name'] || row['chapter'])?.replace(/\n/g, ' ')?.replace(/\r/g, '')?.trim();
         const boardName = (row['Board'] || row['Board_title'] || row['board'])?.replace(/\n/g, ' ')?.replace(/\r/g, '')?.trim();
         const className = (row['Class'] || row['class'])?.replace(/\n/g, ' ')?.replace(/\r/g, '')?.trim();
         const subjectName = (row['Subject'] || row['subject'] || 'Science')?.trim();
         
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
                 subjectKnowledge: (row['subject_knowledge'] || row['Subject_knowledge'])?.trim() || '',
                 revisionCards: [],
                 questions: [],
                 mcqs: [],
                 flowItems: []
             };
         }
         
         const subjKnowledge = (row['subject_knowledge'] || row['Subject_knowledge'])?.trim();
         if (subjKnowledge) {
             chapterConfigs[groupKey].subjectKnowledge = subjKnowledge;
         }
         
         const type = row['Type']?.trim().toLowerCase();
         const image = (row['Image'] || row['Revise image'] || row['image'])?.trim();
         const questionText = row['Question']?.trim();
         const descriptiveAnswer = (row['Answer Descriptive'] || row['Answer'] || row['Expected Answer'])?.trim() || '';
         const mcqAnswer = (row['MCQ answer'] || row['Answer'] || row['Answer Descriptive'])?.trim() || '';

         if (type === 'revise' && image) {
             chapterConfigs[groupKey].revisionCards.push(image);
             chapterConfigs[groupKey].flowItems.push({ type: 'revision_card', content: image });
         } else if (type === 'descriptive' && questionText) {
             const question = {
                 text: questionText,
                 expected: descriptiveAnswer
             };
             if (image) question.image = image;
             chapterConfigs[groupKey].questions.push(question);
             chapterConfigs[groupKey].flowItems.push({ type: 'descriptive_question', ...question });
         } else if (type === 'mcq' && questionText && (row['Option MCQ'] || row['Options'])) {
             const optionsRaw = row['Option MCQ'] || row['Options'] || '';
             const mcq = {
                 text: questionText,
                 options: optionsRaw.split(',').map(o => o.trim()).filter(o => o),
                 expected: mcqAnswer
             };
             if (image) mcq.image = image;
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
              
              const escapedTitle = config.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-–—]/g, '[-–—]').replace(/\s+/g, '\\s+');
              const titleRegex = new RegExp(`^${escapedTitle}$`, 'i');
              chapter = await Chapter.findOne({ title: titleRegex, subjectId: subjectDoc._id });
              if (!chapter) {
                  // Fallback without strict start/end if exact title differs slightly
                  chapter = await Chapter.findOne({ title: new RegExp(config.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), subjectId: subjectDoc._id });
              }
          }
          // Ultimate fallback to just title (Risky)
          else if (config.title) {
              const escapedTitle = config.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              chapter = await Chapter.findOne({ title: new RegExp(`^${escapedTitle}$`, 'i') }) || await Chapter.findOne({ title: new RegExp(escapedTitle, 'i') });
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
