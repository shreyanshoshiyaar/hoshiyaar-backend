import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';

config();

async function exportSessionData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Fetching modules and chapters for mapping...');
    const allModules = await Module.find({}).populate('chapterId').lean();
    const moduleMap = {};
    allModules.forEach(mod => {
      const chapterTitle = (mod.chapterId && mod.chapterId.title) ? mod.chapterId.title.replace(/"/g, '""') : 'Unknown Chapter';
      const moduleTitle = mod.title ? mod.title.replace(/"/g, '""') : 'Unknown Lesson';
      moduleMap[mod._id.toString()] = `${chapterTitle} -> ${moduleTitle}`;
    });

    console.log('Fetching all users...');
    
    // We only need specific fields to save memory
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('username name phone platform pointsLedger')
      .lean();
    
    if (users.length === 0) {
      console.log('❌ No users found.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users. Calculating sessions and generating CSV...`);

    const csvHeader = 'Username,Name,Phone,Platform,Session Start,Session End,Duration (mins),Questions Attempted,Correct Answers,Lessons Played\n';
    let csvRows = [];

    const maxGap = 15 * 60 * 1000; // 15-minute sliding window

    users.forEach(user => {
      const username = user.username ? `"${user.username.replace(/"/g, '""')}"` : 'N/A';
      const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : 'Unknown';
      const phone = user.phone ? `"${user.phone}"` : 'N/A';
      const platform = user.platform || 'unknown';

      // Parse pointsLedger
      const ledgerEntries = user.pointsLedger
        ? (user.pointsLedger instanceof Map
            ? Array.from(user.pointsLedger.values())
            : Object.values(user.pointsLedger))
        : [];

      // Only consider entries with timestamps
      const validEntries = ledgerEntries.filter(e => e.attemptedAt).sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());

      if (validEntries.length === 0) return;

      let currentSessionStart = new Date(validEntries[0].attemptedAt).getTime();
      let currentSessionEnd = currentSessionStart;
      let sessionAttempts = 0;
      let sessionCorrect = 0;
      let sessionModules = new Set();

      const addModuleToSession = (moduleId) => {
        if (!moduleId) return;
        const idStr = moduleId.toString();
        const mappedName = moduleMap[idStr] || idStr;
        sessionModules.add(mappedName);
      };

      for (let i = 0; i < validEntries.length; i++) {
        const entry = validEntries[i];
        const t = new Date(entry.attemptedAt).getTime();

        if (t - currentSessionEnd <= maxGap) {
          // Continue session
          currentSessionEnd = t;
          sessionAttempts++;
          if (entry.correct) sessionCorrect++;
          addModuleToSession(entry.moduleId);
        } else {
          // Close previous session
          const durationMins = Math.max(2, Math.round((currentSessionEnd - currentSessionStart) / 60000));
          const startIso = new Date(currentSessionStart).toISOString();
          const endIso = new Date(currentSessionEnd).toISOString();
          const modulesStr = sessionModules.size > 0 ? `"${Array.from(sessionModules).join(' | ')}"` : 'None';
          
          csvRows.push(`${username},${name},${phone},${platform},"${startIso}","${endIso}",${durationMins},${sessionAttempts},${sessionCorrect},${modulesStr}`);

          // Start new session
          currentSessionStart = t;
          currentSessionEnd = t;
          sessionAttempts = 1;
          sessionCorrect = entry.correct ? 1 : 0;
          sessionModules = new Set();
          addModuleToSession(entry.moduleId);
        }
      }

      // Close final session
      if (sessionAttempts > 0) {
        const durationMins = Math.max(2, Math.round((currentSessionEnd - currentSessionStart) / 60000));
        const startIso = new Date(currentSessionStart).toISOString();
        const endIso = new Date(currentSessionEnd).toISOString();
        const modulesStr = sessionModules.size > 0 ? `"${Array.from(sessionModules).join(' | ')}"` : 'None';
        
        csvRows.push(`${username},${name},${phone},${platform},"${startIso}","${endIso}",${durationMins},${sessionAttempts},${sessionCorrect},${modulesStr}`);
      }
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const filename = 'all_user_sessions.csv';

    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`✅ Successfully exported session data to ${filename}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

exportSessionData();
