import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;

async function debugMeta() {
  console.log("🔍 Debugging Meta WhatsApp Token & Setup...");
  console.log("-------------------------------------------------");

  try {
    // 1. Check Phone Number Info
    console.log("1️⃣ Checking Phone Number ID access...");
    const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}?access_token=${WHATSAPP_TOKEN}`);
    const phoneData = await phoneRes.json();
    
    if (phoneData.error) {
      console.log("❌ Phone Number Error:");
      console.log(phoneData.error.message || phoneData.error);
    } else {
      console.log("✅ Phone Number ID is accessible!");
      console.log(`   Registered Name: ${phoneData.verified_name || 'N/A'}`);
      console.log(`   Display Phone: ${phoneData.display_phone_number || 'N/A'}`);
      console.log(`   Quality Rating: ${phoneData.quality_rating || 'N/A'}`);
    }

    console.log("\n2️⃣ Checking Token Permissions...");
    // 2. Check Token Permissions (System Users act as 'me')
    const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${WHATSAPP_TOKEN}`);
    const permData = await permRes.json();

    if (permData.error) {
      console.log("❌ Permission Check Error:");
      console.log(permData.error.message || permData.error);
    } else if (permData.data) {
      const hasMessaging = permData.data.find(p => p.permission === 'whatsapp_business_messaging' && p.status === 'granted');
      if (hasMessaging) {
        console.log("✅ Token HAS the 'whatsapp_business_messaging' permission.");
      } else {
        console.log("❌ CRITICAL: Token is MISSING the 'whatsapp_business_messaging' permission!");
        console.log("   Currently granted permissions:");
        permData.data.forEach(p => console.log(`   - ${p.permission}: ${p.status}`));
      }
    }

    console.log("\n3️⃣ Checking Message Templates...");
    // 3. To check templates, we need the WABA ID. The phone number endpoint might return it if we query fields
    const wabaRes = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_account&access_token=${WHATSAPP_TOKEN}`);
    const wabaData = await wabaRes.json();
    
    if (wabaData.whatsapp_account && wabaData.whatsapp_account.id) {
      const wabaId = wabaData.whatsapp_account.id;
      const tmplRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?name=login_otp&access_token=${WHATSAPP_TOKEN}`);
      const tmplData = await tmplRes.json();
      
      if (tmplData.data && tmplData.data.length > 0) {
        console.log(`✅ Found 'login_otp' template! Status: ${tmplData.data[0].status}`);
        if (tmplData.data[0].status !== 'APPROVED') {
          console.log("❌ Template is NOT approved yet. It must be APPROVED to send.");
        }
      } else {
        console.log("❌ Could not find a template named 'login_otp'. Did you name it exactly that?");
      }
    } else {
      console.log("⚠️ Could not fetch WhatsApp Business Account ID to check templates.");
    }

  } catch (err) {
    console.error("Network/Fetch error:", err);
  }
  
  console.log("-------------------------------------------------");
}

debugMeta();
