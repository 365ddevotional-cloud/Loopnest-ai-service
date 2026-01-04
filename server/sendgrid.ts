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

export async function sendContactMessageNotification(
  senderName: string,
  senderEmail: string,
  subject: string,
  message: string,
  isUrgent: boolean,
  isPrayerRelated: boolean
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const urgentLabel = isUrgent ? '[URGENT] ' : '';
    const prayerLabel = isPrayerRelated ? '[Prayer Related] ' : '';
    
    const msg = {
      to: '365ddevotional@gmail.com',
      from: fromEmail,
      replyTo: senderEmail,
      subject: `${urgentLabel}${prayerLabel}${subject}`,
      text: `New Contact Message from ${senderName} (${senderEmail})\n\nSubject: ${subject}\n\nMessage:\n${message}\n\n---\nThis message was sent via 365 Daily Devotional contact form.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">New Contact Message</p>
          </div>
          
          <div style="background-color: #f8f6f3; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${senderName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${senderEmail}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            ${isUrgent ? '<p style="margin: 5px 0; color: #dc2626;"><strong>Marked as Urgent</strong></p>' : ''}
            ${isPrayerRelated ? '<p style="margin: 5px 0; color: #9c6b30;"><strong>Prayer Related</strong></p>' : ''}
          </div>
          
          <div style="border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            This message was sent via 365 Daily Devotional contact form.
          </p>
        </div>
      `
    };

    await client.send(msg);
    console.log(`Contact message notification sent for ${senderEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send contact message notification:', error);
    return false;
  }
}

export async function sendFeedbackNotification(
  senderName: string | null,
  senderEmail: string | null,
  feedbackType: string,
  message: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const typeLabels: Record<string, string> = {
      app_design: "App Design",
      content_quality: "Content Quality",
      feature_request: "Feature Request",
      bug_issue: "Bug / Issue",
      other: "Other",
    };
    
    const typeLabel = typeLabels[feedbackType] || feedbackType;
    const displayName = senderName || "Anonymous";
    const displayEmail = senderEmail || "Not provided";
    
    const msg = {
      to: '365ddevotional@gmail.com',
      from: fromEmail,
      replyTo: senderEmail || undefined,
      subject: `Feedback & Suggestions – 365 Daily Devotional [${typeLabel}]`,
      text: `New Feedback from ${displayName}\n\nEmail: ${displayEmail}\nType: ${typeLabel}\n\nMessage:\n${message}\n\n---\nThis was sent via 365 Daily Devotional Feedback form.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">Feedback & Suggestions</p>
          </div>
          
          <div style="background-color: #f8f6f3; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${displayName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${displayEmail}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${typeLabel}</p>
          </div>
          
          <div style="border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `
    };

    await client.send(msg);
    console.log(`Feedback notification sent`);
    return true;
  } catch (error) {
    console.error('Failed to send feedback notification:', error);
    return false;
  }
}

export async function sendPartnershipNotification(
  fullName: string,
  email: string,
  organization: string | null,
  partnershipType: string,
  message: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const typeLabels: Record<string, string> = {
      ministry_collaboration: "Ministry Collaboration",
      media_content: "Media & Content Creation",
      outreach_missions: "Outreach & Missions",
      events_speaking: "Events & Speaking Invitations",
      resource_distribution: "Resource Distribution",
    };
    
    const typeLabel = typeLabels[partnershipType] || partnershipType;
    
    const msg = {
      to: '365ddevotional@gmail.com',
      from: fromEmail,
      replyTo: email,
      subject: `Partnership Inquiry – 365 Daily Devotional [${typeLabel}]`,
      text: `New Partnership Inquiry from ${fullName}\n\nOrganization: ${organization || "Not specified"}\nEmail: ${email}\nType: ${typeLabel}\n\nMessage:\n${message}\n\n---\nThis was sent via 365 Daily Devotional Partnership form.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">Partnership Inquiry</p>
          </div>
          
          <div style="background-color: #f8f6f3; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${fullName}</p>
            <p style="margin: 5px 0;"><strong>Organization:</strong> ${organization || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${typeLabel}</p>
          </div>
          
          <div style="border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `
    };

    await client.send(msg);
    console.log(`Partnership notification sent for ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send partnership notification:', error);
    return false;
  }
}

export async function sendGeneralInquiryNotification(
  senderName: string,
  senderEmail: string,
  topic: string,
  message: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const topicLabels: Record<string, string> = {
      app_question: "App Question",
      devotional_content: "Devotional Content",
      prayer_counseling: "Prayer / Counseling",
      youtube_media: "YouTube / Media",
      shop_resources: "Shop / Resources",
      other: "Other",
    };
    
    const topicLabel = topicLabels[topic] || topic;
    
    const msg = {
      to: '365ddevotional@gmail.com',
      from: fromEmail,
      replyTo: senderEmail,
      subject: `General Inquiry – 365 Daily Devotional [${topicLabel}]`,
      text: `New General Inquiry from ${senderName} (${senderEmail})\n\nTopic: ${topicLabel}\n\nMessage:\n${message}\n\n---\nThis message was sent via 365 Daily Devotional General Inquiry form.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">General Inquiry</p>
          </div>
          
          <div style="background-color: #f8f6f3; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${senderName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${senderEmail}</p>
            <p style="margin: 5px 0;"><strong>Topic:</strong> ${topicLabel}</p>
          </div>
          
          <div style="border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            This message was sent via 365 Daily Devotional General Inquiry form.
          </p>
        </div>
      `
    };

    await client.send(msg);
    console.log(`General inquiry notification sent for ${senderEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send general inquiry notification:', error);
    return false;
  }
}

export async function sendContactAutoReply(
  toEmail: string,
  recipientName: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: '365 Daily Devotional - We Received Your Message',
      text: `Dear ${recipientName},\n\nWe've received your message and will respond as soon as possible.\n\n"The Lord bless you and keep you." – Numbers 6:24\n\nWith love and prayers,\n365 Daily Devotional Team`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
          </div>
          
          <p style="color: #333; font-size: 16px;">Dear ${recipientName},</p>
          
          <p style="color: #333; font-size: 16px;">We've received your message and will respond as soon as possible.</p>
          
          <div style="background-color: #f8f6f3; border-left: 4px solid #9c6b30; padding: 20px; margin: 30px 0; text-align: center;">
            <p style="color: #9c6b30; font-size: 18px; font-style: italic; margin: 0;">
              "The Lord bless you and keep you."
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">– Numbers 6:24</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            With love and prayers,<br>
            <strong>365 Daily Devotional Team</strong>
          </p>
        </div>
      `
    };

    await client.send(msg);
    console.log(`Auto-reply sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send auto-reply:', error);
    return false;
  }
}
