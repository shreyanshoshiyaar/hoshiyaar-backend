import cron from 'node-cron';
import User from '../models/User.js';
import { sendMetaWhatsAppTemplate } from './whatsappService.js';
import dotenv from 'dotenv';
dotenv.config();

export const startWhatsappNudgeCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running WhatsApp Nudge Check Cron...');

    try {
      const now = new Date();

      // Calculate if current time is between 5 PM and 10 PM IST
      const currentUTCHour = now.getUTCHours();
      const currentUTCMinute = now.getUTCMinutes();
      // IST is UTC + 5:30. 
      // 5:00 PM IST = 11:30 AM UTC
      // 10:00 PM IST = 4:30 PM UTC
      const currentMinutesSinceMidnightUTC = (currentUTCHour * 60) + currentUTCMinute;
      const windowStartMinutes = (11 * 60) + 30; // 11:30 AM UTC
      const windowEndMinutes = (16 * 60) + 30; // 4:30 PM UTC
      
      const isEveningWindow = currentMinutesSinceMidnightUTC >= windowStartMinutes && currentMinutesSinceMidnightUTC <= windowEndMinutes;

      if (!isEveningWindow) {
        return; // Only run the cron logic during the 5 PM - 10 PM IST window
      }

      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60000);
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60000);

      // Testing Filter
      const testNumbersStr = process.env.TEST_WHATSAPP_NUMBERS || "";
      const testNumbers = testNumbersStr.split(',').map(n => n.trim()).filter(Boolean);
      let queryFilter = { whatsappOptIn: true, phone: { $ne: null } };
      
      if (testNumbers.length > 0) {
        queryFilter.phone = { $in: testNumbers };
        console.log(`⚠️ Meta WhatsApp Nudges restricted to test numbers: ${testNumbers.join(', ')}`);
      }

      // 1. 0 MIN (No module started) nudge after 30 minutes
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
          const result = await sendMetaWhatsAppTemplate({
            to: user.phone,
            templateName: 'nudge_0_min',
            languageCode: 'en',
            templateParams: [user.name || 'Learner'],
            headerImage: 'https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png'
          });
          if (result) {
            user.whatsappNudges.noModule30mSent = true;
            await user.save({ validateBeforeSave: false });
          }
        } catch (e) { console.error('Failed to send 0 min nudge to', user.phone); }
      }

      /* --- HALTED TEMPORARILY AS PER REQUEST ---
      // 2. MISSION STARTED (Started but not completed) nudge after 2 hours
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
          const result = await sendMetaWhatsAppTemplate({
            to: user.phone,
            templateName: 'nudge_mission_incomplete',
            languageCode: 'en',
            templateParams: [user.name || 'Learner'],
            headerImage: 'https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png'
          });
          if (result) {
            user.whatsappNudges.startedNotCompleted2hSent = true;
            await user.save({ validateBeforeSave: false });
          }
        } catch (e) { console.error('Failed to send incomplete mission nudge to', user.phone); }
      }

      // 3. STREAK ABOUT TO BREAK (24-hour inactive) nudge
        const inactive24hUsers = await User.find({
          ...queryFilter,
          lastActiveAt: { $lte: twentyFourHoursAgo },
          'whatsappNudges.inactive24hSent': false,
          chaptersProgress: { $not: { $size: 0 } } // Make sure they actually used the app at least once
        });

        for (const user of inactive24hUsers) {
          try {
            const result = await sendMetaWhatsAppTemplate({
              to: user.phone,
              templateName: 'nudge_streak_break',
              languageCode: 'en',
              templateParams: [user.name || 'Learner'],
              headerImage: 'https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png'
            });
            if (result) {
              user.whatsappNudges.inactive24hSent = true;
              await user.save({ validateBeforeSave: false });
            }
          } catch (e) { console.error('Failed to send streak break nudge to', user.phone); }
        }

        // 4. 3 DAYS INACTIVE nudge
        const inactive3DaysUsers = await User.find({
          ...queryFilter,
          lastActiveAt: { $lte: seventyTwoHoursAgo },
          'whatsappNudges.inactive3DaysSent': false,
          chaptersProgress: { $not: { $size: 0 } }
        });

        for (const user of inactive3DaysUsers) {
          try {
            const result = await sendMetaWhatsAppTemplate({
              to: user.phone,
              templateName: 'nudge_3_days_inactive',
              languageCode: 'en',
              templateParams: [user.name || 'Learner'],
              headerImage: 'https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png'
            });
            if (result) {
              user.whatsappNudges.inactive3DaysSent = true;
              await user.save({ validateBeforeSave: false });
            }
          } catch (e) { console.error('Failed to send 3 days inactive nudge to', user.phone); }
        }
      */
    } catch (error) {
      console.error('Error in WhatsApp Nudge Cron:', error);
    }
  });
  console.log('🚀 WhatsApp Nudge Cron Job Scheduled (Every 5 mins)');
};
