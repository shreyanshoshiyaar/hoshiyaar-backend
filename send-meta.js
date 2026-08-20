import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const META_ACCESS_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error("❌ Missing WHATSAPP_PERMANENT_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env file.");
  process.exit(1);
}

async function sendWhatsAppMessage() {
  const recipientNumber = '919769976589'; // Vikas Samant
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "text",
    text: { 
      preview_url: true,
      body: "Hi Vikas! Your first Hoshiyaar lesson is waiting for you. Ready to unlock new concepts and earn some points? \n🏆 Start learning here: \nhttps://play.google.com/store/apps/details?id=com.hoshiyaarlearning.app"
    }
  };

  try {
    console.log(`Sending message to ${recipientNumber} via Meta API...`);
    
    const response = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Message sent successfully!', data);
    } else {
      console.error('❌ Failed to send message. Meta API Error:');
      console.error(data);
      if (data.error && data.error.code === 131047) {
        console.error("\n⚠️ IMPORTANT: You hit the 24-hour service window limit. You cannot send a free-form message to this user because they haven't replied to the bot in 24 hours. You MUST use an approved template instead.");
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

sendWhatsAppMessage();
