// SendGrid email integration
import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export async function sendPrayerReplyNotification(
  toEmail: string,
  requesterName: string,
  replyMessage: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: '365 Daily Devotional - Reply to Your Prayer Request',
      text: `Dear ${requesterName},\n\nYou have received a reply to your prayer request:\n\n${replyMessage}\n\nVisit our website to view the full conversation and send follow-up messages.\n\nWith love and prayers,\n365 Daily Devotional Team`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">Prayer & Counseling Ministry</p>
          </div>
          
          <p style="color: #333; font-size: 16px;">Dear ${requesterName},</p>
          
          <p style="color: #333; font-size: 16px;">You have received a reply to your prayer request:</p>
          
          <div style="background-color: #f8f6f3; border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${replyMessage}</p>
          </div>
          
          <p style="color: #333; font-size: 16px;">Visit our website to view the full conversation and send follow-up messages.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            With love and prayers,<br>
            <strong>365 Daily Devotional Team</strong>
          </p>
        </div>
      `
    };

    await client.send(msg);
    console.log(`Email notification sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}
