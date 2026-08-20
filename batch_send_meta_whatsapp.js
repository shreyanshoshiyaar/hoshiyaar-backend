import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Note: Meta Graph API requests can be made natively in Node v18+ via global fetch
// If you are on an older version of Node, you may need to install node-fetch

// Adjust path as needed based on where you run this script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import User from './models/User.js';

// === REQUIRED CREDENTIALS & SETTINGS ===
const META_ACCESS_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN || 'EAAWNRoECWxcBRlr0aI2h3YbM39pqWhaoCdnXZCV6OFQoLMa4XBv13sgLjmCbGgDP5dF7xfeRwKtqo470VZADwPaEFRy8PuZA7JpMCTH018ZCl8rO2dgfg4BScEtuGaD4KWu4AvVJxZBajDgxmZAnmjPP92Lr6CBzWpZA3WyHrDbZCs6rmqqRfp97TRrgoQqKPHh0VQZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1186392337879967';
const TEMPLATE_NAME = 'inactive_users'; 
const LANGUAGE_CODE = 'en'; // Update if you use 'hi' or another language

// Testing safeguard: Set to false when you are ready to message real users
const IS_DRY_RUN = false;
// Optional: Only send to this number during your first real test (leave empty string to send to all)
const TEST_NUMBER_ONLY = '919867735936'; // Must include country code

import axios from 'axios';

const sendMetaWhatsAppTemplate = async (phone, userName) => {
  const recipientNumber = String(phone).replace(/\D/g, ''); // Ensure clean phone string
  
  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: LANGUAGE_CODE },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                // Public URL of the image to send
                link: "https://res.cloudinary.com/fhscvc7p/image/upload/v1787130099/1787127547462-01a01919-1bca-7c07-a027-759c7328fc12_1_h04wxn.png"
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: userName || "Learner" }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`✅ Sent to ${recipientNumber}`);
    return true;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Failed to send to ${recipientNumber}. Meta API Error:`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network error for ${recipientNumber}:`, error.message);
    }
    return false;
  }
};

const run = async () => {
  try {
    if (!IS_DRY_RUN && TEST_NUMBER_ONLY) {
      console.log(`⚠️ WARNING: Running in direct test mode for phone number: ${TEST_NUMBER_ONLY}`);
      console.log('Bypassing database filters for testing purposes...');
      
      const success = await sendMetaWhatsAppTemplate(TEST_NUMBER_ONLY, "Akshit");
      if (success) {
        console.log('\n🎉 Test message sent successfully!');
      } else {
        console.log('\n❌ Test message failed.');
      }
      process.exit(0);
      return;
    }

    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Users inactive before August 1st 2026
    const cutoffDate = new Date('2026-08-01T00:00:00.000Z');
    
    let queryFilter = {
      whatsappOptIn: true,
      phone: { $ne: null },
      lastActiveAt: { $lt: cutoffDate }
    };

    if (!IS_DRY_RUN && TEST_NUMBER_ONLY) {
      queryFilter.phone = TEST_NUMBER_ONLY;
      console.log(`⚠️ WARNING: Running in test mode for phone number: ${TEST_NUMBER_ONLY}`);
    }

    const inactiveUsers = await User.find(queryFilter).select('name phone lastActiveAt');

    console.log(`Found ${inactiveUsers.length} users who have been inactive since before August 1st, 2026.`);
    
    if (IS_DRY_RUN) {
      console.log('DRY RUN ENABLED. No messages will be sent. Sample users:');
      inactiveUsers.slice(0, 5).forEach(u => {
        console.log(`- ${u.name || 'Unknown'}: ${u.phone} (Last active: ${u.lastActiveAt})`);
      });
      console.log('To send actual messages, set IS_DRY_RUN = false.');
      return;
    }

    console.log('Starting message dispatch...');
    let successCount = 0;
    
    for (const user of inactiveUsers) {
      const success = await sendMetaWhatsAppTemplate(user.phone, user.name);
      if (success) successCount++;
      
      // Sleep for 100ms to avoid hitting Meta rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Campaign complete! Successfully sent to ${successCount}/${inactiveUsers.length} users.`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
