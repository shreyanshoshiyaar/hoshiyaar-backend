import cron from 'node-cron';
import User from '../models/User.js';
import { sendAiSensyTemplate } from './whatsappService.js';
import dotenv from 'dotenv';
dotenv.config();

export const startWhatsappNudgeCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running WhatsApp Nudge Check Cron...');

    try {
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60000);

      // Testing Filter
      const testNumbersStr = process.env.TEST_WHATSAPP_NUMBERS || "";
      const testNumbers = testNumbersStr.split(',').map(n => n.trim()).filter(Boolean);
      let queryFilter = { whatsappOptIn: true, phone: { $ne: null } };
      
      if (testNumbers.length > 0) {
        queryFilter.phone = { $in: testNumbers };
        console.log(`⚠️ AiSensy Nudges restricted to test numbers: ${testNumbers.join(', ')}`);
      }

      // 1. No module started nudge after 30 minutes
      // User registered > 30 mins ago, chaptersProgress is empty or 0
      const noModuleUsers = await User.find({
        ...queryFilter,
        createdAt: { $lte: thirtyMinsAgo },
        'whatsappNudges.noModule30mSent': false,
        $or: [
          { chaptersProgress: { $exists: false } },
          { chaptersProgress: { $size: 0 } }
        ]
      });

      for (const user of noModuleUsers) {
        try {
          await sendAiSensyTemplate({
            to: user.phone,
            templateName: 'no_module_started',
            userName: user.name || 'Learner',
            customContactFields: { ParentName: user.name, Class: user.classLevel || '' },
            templateParams: [user.name || 'Learner'] 
          });
          user.whatsappNudges.noModule30mSent = true;
          await user.save({ validateBeforeSave: false });
        } catch (e) { console.error('Failed to send 30m nudge to', user.phone); }
      }

      // 2. Started but not completed nudge after 2 hours
      // User chaptersProgress exists, but no modules are fully marked as completed, updated > 2 hours ago
      // Actually, an easier check is if they have progress, but 'conceptCompleted' and 'quizCompleted' are false
      // and updatedAt is > 2 hours ago.
      const startedNotCompletedUsers = await User.find({
        ...queryFilter,
        'whatsappNudges.startedNotCompleted2hSent': false,
        chaptersProgress: { 
          $elemMatch: { 
            updatedAt: { $lte: twoHoursAgo },
            $or: [
              { conceptCompleted: false },
              { quizCompleted: false }
            ]
          } 
        }
      });

      for (const user of startedNotCompletedUsers) {
        try {
          await sendAiSensyTemplate({
            to: user.phone,
            templateName: 'module_started_incomplete',
            userName: user.name || 'Learner',
            customContactFields: { ParentName: user.name, Class: user.classLevel || '' },
            templateParams: [user.name || 'Learner']
          });
          user.whatsappNudges.startedNotCompleted2hSent = true;
          await user.save({ validateBeforeSave: false });
        } catch (e) { console.error('Failed to send 2h nudge to', user.phone); }
      }

      // 3. 24-hour inactive user reactivation message
      const inactive24hUsers = await User.find({
        ...queryFilter,
        lastActiveAt: { $lte: twentyFourHoursAgo },
        'whatsappNudges.inactive24hSent': false,
        chaptersProgress: { $not: { $size: 0 } } // Make sure they actually used the app at least once
      });

      for (const user of inactive24hUsers) {
        try {
          await sendAiSensyTemplate({
            to: user.phone,
            templateName: 'reactivation_24h_inactive',
            userName: user.name || 'Learner',
            customContactFields: { ParentName: user.name, Class: user.classLevel || '', LastActiveDate: user.lastActiveAt },
            templateParams: [user.name || 'Learner']
          });
          user.whatsappNudges.inactive24hSent = true;
          await user.save({ validateBeforeSave: false });
        } catch (e) { console.error('Failed to send 24h nudge to', user.phone); }
      }

    } catch (error) {
      console.error('Error in WhatsApp Nudge Cron:', error);
    }
  });
  console.log('🚀 WhatsApp Nudge Cron Job Scheduled (Every 5 mins)');
};
