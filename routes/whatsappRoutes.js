import express from 'express';

const router = express.Router();

// Get verification token from environment variables
// Note: Fallback provided, but it's best to set WHATSAPP_VERIFY_TOKEN in .env
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hoshiyaar_whatsapp_verify_token_123';

/**
 * Webhook Verification (GET request from Meta)
 * Meta sends a GET request to verify the webhook URL.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook Verified!');
      res.status(200).send(challenge);
    } else {
      console.error('❌ WhatsApp Webhook Verification Failed: Token mismatch');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

/**
 * Webhook Event Handler (POST request from Meta)
 * Receives messages, status updates, and other events.
 */
router.post('/webhook', (req, res) => {
  const body = req.body;

  // Check if this is an event from a WhatsApp API
  if (body.object === 'whatsapp_business_account') {
    // Return a '200 OK' response to all requests to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
    
    // Process the event
    try {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; 
        const msgBody = body.entry[0].changes[0].value.messages[0].text?.body;
        
        console.log(`📩 Message received from: ${from}`);
        if (msgBody) {
          console.log(`💬 Message content: ${msgBody}`);
        }
        
        // TODO: Handle incoming message logic (e.g., OTP validation via chat, support, etc.)
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook event:', error);
    }
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

export default router;
