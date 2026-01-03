// Twilio SMS integration
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables

let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    return null;
  }
  
  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
    return null;
  }
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

export async function sendSmsNotification(
  toPhoneNumber: string,
  requesterName: string,
  replyMessage: string
): Promise<boolean> {
  try {
    const client = getTwilioClient();
    
    if (!client) {
      console.log('Twilio not configured, skipping SMS notification');
      return false;
    }
    
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      console.log('TWILIO_PHONE_NUMBER not set, skipping SMS notification');
      return false;
    }
    
    // Truncate message if too long for SMS (max ~160 chars per segment)
    const truncatedMessage = replyMessage.length > 140 
      ? replyMessage.substring(0, 137) + '...'
      : replyMessage;
    
    const messageBody = `365 Daily Devotional: Dear ${requesterName}, you received a reply to your prayer request: "${truncatedMessage}" - Visit our site for the full message.`;
    
    await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: toPhoneNumber,
    });
    
    console.log(`SMS notification sent to ${toPhoneNumber.substring(0, 4)}****`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS notification:', error);
    return false;
  }
}

// E.164 phone number validation regex
// Examples: +1234567890, +442071234567
export function isValidE164PhoneNumber(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}
