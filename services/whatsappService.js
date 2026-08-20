import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const META_ACCESS_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN || process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

/**
 * Sends a WhatsApp Template via official Meta Graph API
 * @param {object} params
 * @param {string} params.to - Destination phone number
 * @param {string} params.templateName - Name of the approved template
 * @param {string} params.languageCode - Language code of template (default 'en')
 * @param {array} params.templateParams - Array of variables for the body (e.g. ['Akshit'])
 * @param {string} params.headerImage - Optional URL of an image to send in the header
 */
export const sendMetaWhatsAppTemplate = async ({ to, templateName, languageCode = 'en', templateParams = [], headerImage = null }) => {
  if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("⚠️ WhatsApp Meta Credentials are not configured in .env. Skipping WhatsApp message.");
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
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: []
    }
  };

  // Add header image if provided
  if (headerImage) {
    payload.template.components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: headerImage }
        }
      ]
    });
  }

  // Add body parameters if provided
  if (templateParams && templateParams.length > 0) {
    payload.template.components.push({
      type: "body",
      parameters: templateParams.map(param => ({
        type: "text",
        text: param
      }))
    });
  }

  try {
    const response = await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Meta WhatsApp template '${templateName}' sent to ${formattedPhone}.`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error sending Meta template '${templateName}':`, error.response.data);
    } else {
      console.error(`❌ Network Error sending Meta template '${templateName}':`, error.message);
    }
    return null;
  }
};
