import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

/**
 * Sends a WhatsApp Template via AiSensy API
 * @param {string} to - Destination phone number (e.g. "919999999999")
 * @param {string} templateName - Name of the approved template
 * @param {string} userName - Name of the user
 * @param {object} customContactFields - Object mapping to custom fields in AiSensy
 * @param {array} templateParams - Ordered array of parameters for the template body/buttons
 * @returns {Promise<object>} response from AiSensy
 */
export const sendAiSensyTemplate = async ({ to, templateName, userName = "Learner", customContactFields = {}, templateParams = [] }) => {
  // AiSensy is temporarily disabled as per user request
  return null;

  if (!AISENSY_API_KEY) {
    console.warn("⚠️ AISENSY_API_KEY is not configured in .env. Skipping WhatsApp message.");
    return null;
  }

  // Ensure phone number has country code 91 if it's 10 digits
  let formattedPhone = String(to).replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  } else if (formattedPhone.startsWith('0')) {
    formattedPhone = `91${formattedPhone.substring(1)}`;
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }

  const payload = {
    apiKey: AISENSY_API_KEY,
    campaignName: templateName, // AiSensy uses campaignName for API triggering
    destination: formattedPhone,
    userName: userName,
    source: customContactFields.SignupSource || 'website_api',
    templateParams: templateParams,
    contactFields: customContactFields
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ AiSensy WhatsApp template '${templateName}' sent to ${formattedPhone}.`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error sending AiSensy template '${templateName}':`, error.response?.data || error.message);
    return null;
  }
};
