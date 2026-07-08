import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;
const phone = "916387620131";
const otpCode = "123456";

const payload = {
  messaging_product: 'whatsapp',
  to: phone,
  type: 'template',
  template: {
    name: 'login_otp',
    language: {
      code: 'en'
    },
    components: [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: otpCode
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          {
            type: 'text',
            text: otpCode
          }
        ]
      }
    ]
  }
};

async function test() {
  console.log(`Sending OTP ${otpCode} to ${phone}...`);
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
