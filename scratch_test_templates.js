import dotenv from 'dotenv';
import path from 'path';
import { sendMetaWhatsAppTemplate } from './services/whatsappService.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const run = async () => {
  const testNumber = '919867735936';
  const testName = 'Akshit';

  const templates = [
    'nudge_0_min',
    'nudge_mission_incomplete',
    'nudge_streak_break',
    'nudge_3_days_inactive'
  ];

  console.log(`🚀 Sending 4 test templates to ${testNumber}...\n`);

  for (const template of templates) {
    console.log(`Testing: ${template}...`);
    const success = await sendMetaWhatsAppTemplate({
      to: testNumber,
      templateName: template,
      languageCode: 'en',
      templateParams: [testName],
      headerImage: 'https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png'
    });

    if (success) {
      console.log(`✅ Success for ${template}\n`);
    } else {
      console.log(`❌ Failed for ${template}\n`);
    }
    
    // Slight delay to prevent rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('🎉 Testing Complete!');
  process.exit(0);
};

run();
