import dotenv from 'dotenv';
dotenv.config();

const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const CAMPAIGN_NAME = process.env.AISENSY_CAMPAIGN_NAME || 'login_otp';

async function testAiSensy() {
    console.log("🚀 Testing AiSensy API integration...");
    
    // Replace with your real test phone number including country code (e.g. 919999999999)
    const testPhone = '919867735936'; 
    const otpCode = '123456';

    const payload = {
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGN_NAME,
        destination: testPhone,
        userName: "Learner",
        templateParams: [otpCode], // OTP in body
        buttons: [
            {
                type: "button",
                sub_type: "url",
                index: 0,
                parameters: [
                    {
                        type: "text",
                        text: otpCode
                    }
                ]
            }
        ]
    };

    console.log("Sending payload:", payload);

    try {
        const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("\n📡 Response Status:", response.status);
        console.log("📡 Response Data:", data);

        if (!response.ok || data.success === false) {
            console.log("❌ Failed!");
        } else {
            console.log("✅ Success! Message sent via AiSensy.");
        }
    } catch (err) {
        console.error("❌ Network Error:", err);
    }
}

testAiSensy();
