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

export async function sendDonationThankYouEmail(
  toEmail: string,
  donorName: string,
  message: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const htmlMessage = message.replace(/\n/g, "<br>");
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: "Thank You for Supporting 365 Daily Devotional",
      text: message,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">Support the Ministry</p>
          </div>
          <div style="border-left: 4px solid #9c6b30; padding: 20px; margin: 20px 0; background: #f8f6f3;">
            <p style="color: #333; font-size: 16px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${htmlMessage}</p>
          </div>
        </div>
      `,
    };
    await client.send(msg);
    console.log(`Donation thank-you sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to send donation thank-you:", error);
    return false;
  }
}

export async function sendChurchNameChangeSecurityEmail(
  toEmail: string,
  ownerName: string,
  oldName: string,
  newName: string,
  churchSlug: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const dateStr = new Date().toUTCString();
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: `Security Alert: Your church name was changed — 365 Daily Devotional`,
      text: `Hi ${ownerName},\n\nYour church name on 365 Daily Devotional was just changed.\n\nPrevious name: ${oldName}\nNew name: ${newName}\nChanged: ${dateStr}\n\nIf you made this change, no action is needed.\n\nIf you did NOT make this change, please contact us immediately at 365ddevotional@gmail.com and log into your account to review your settings.\n\nWith prayers,\n365 Daily Devotional Team`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9c6b30; margin: 0;">365 Daily Devotional</h1>
            <p style="color: #666; margin: 5px 0;">Church Mode — Security Alert</p>
          </div>
          <p style="color: #333; font-size: 16px;">Hi ${ownerName},</p>
          <p style="color: #333; font-size: 16px;">Your church name on <strong>365 Daily Devotional</strong> was just changed.</p>
          <div style="background-color: #fff8e1; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Previous name:</strong> ${oldName}</p>
            <p style="margin: 5px 0;"><strong>New name:</strong> ${newName}</p>
            <p style="margin: 5px 0; color: #666; font-size: 13px;">Changed: ${dateStr}</p>
          </div>
          <p style="color: #333; font-size: 15px;">If you made this change, no action is needed.</p>
          <p style="color: #c0392b; font-size: 15px; font-weight: bold;">If you did NOT make this change, please contact us immediately at <a href="mailto:365ddevotional@gmail.com">365ddevotional@gmail.com</a> and log into your account to review your settings.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">With prayers,<br><strong>365 Daily Devotional Team</strong></p>
        </div>
      `
    };
    await client.send(msg);
    console.log(`Church name change security email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send church name change security email:', error);
    return false;
  }
}

// ─── Church Mode: Welcome Email ───────────────────────────────────────────────

const WELCOME_CONTENT: Record<string, {
  subject: string; heading: string; greeting: string;
  intro: (org: string) => string; featureHeader: string; features: string[];
  statusLabel: string; pendingNote: string; securityNote: string;
  closing: string; footer: string;
}> = {
  en: {
    subject: "Welcome to Church Mode on 365 Daily Devotional",
    heading: "Welcome to Church Mode",
    greeting: "Hello",
    intro: (org) => `Thank you for registering ${org} with us. We are honored to support your church, ministry, Christian organization, association, fellowship, or faith community.`,
    featureHeader: "With Church Mode your organization can:",
    features: [
      "Create a dedicated organization space",
      "Invite and manage members",
      "Create departments, ministries, and groups",
      "Upload sermons and announcements",
      "Receive prayer requests",
      "Manage events, tasks, attendance, and assignments",
      "Communicate with members",
      "Manage organization branding and logos",
      "Provide online giving options where available",
      "View organization activity and insights",
      "Use Church Mode in English, Spanish, and French",
    ],
    statusLabel: "Your registration status:",
    pendingNote: "Our platform team will review your registration. You will receive an in-app notification and email when the review is completed.",
    securityNote: "365 Daily Devotional will never ask you to send your password by email.",
    closing: "We pray that this platform will help your organization connect, grow, serve, and strengthen believers.",
    footer: "Blessings,<br><strong>365 Daily Devotional Team</strong><br>365ddevotional@gmail.com<br><a href=\"https://365dailydevotional.com\" style=\"color:#9c6b30;\">365dailydevotional.com</a>",
  },
  es: {
    subject: "Bienvenido a Church Mode en 365 Daily Devotional",
    heading: "Bienvenido a Church Mode",
    greeting: "Hola",
    intro: (org) => `Gracias por registrar ${org} con nosotros. Es un honor apoyar a su iglesia, ministerio, organización cristiana, asociación, fraternidad o comunidad de fe.`,
    featureHeader: "Con Church Mode su organización puede:",
    features: [
      "Crear un espacio dedicado para la organización",
      "Invitar y gestionar miembros",
      "Crear departamentos, ministerios y grupos",
      "Subir sermones y anuncios",
      "Recibir solicitudes de oración",
      "Gestionar eventos, tareas, asistencia y asignaciones",
      "Comunicarse con miembros",
      "Gestionar la identidad visual y logos de la organización",
      "Ofrecer opciones de ofrenda en línea donde estén disponibles",
      "Ver actividad e información de la organización",
      "Usar Church Mode en inglés, español y francés",
    ],
    statusLabel: "Estado de su registro:",
    pendingNote: "Nuestro equipo revisará su registro. Recibirá una notificación en la aplicación y por correo cuando la revisión haya concluido.",
    securityNote: "365 Daily Devotional nunca le pedirá que envíe su contraseña por correo electrónico.",
    closing: "Oramos para que esta plataforma ayude a su organización a conectar, crecer, servir y fortalecer a los creyentes.",
    footer: "Bendiciones,<br><strong>Equipo de 365 Daily Devotional</strong><br>365ddevotional@gmail.com<br><a href=\"https://365dailydevotional.com\" style=\"color:#9c6b30;\">365dailydevotional.com</a>",
  },
  fr: {
    subject: "Bienvenue dans Church Mode sur 365 Daily Devotional",
    heading: "Bienvenue dans Church Mode",
    greeting: "Bonjour",
    intro: (org) => `Merci d'avoir inscrit ${org} auprès de nous. Nous sommes honorés de soutenir votre église, ministère, organisation chrétienne, association, fraternité ou communauté de foi.`,
    featureHeader: "Avec Church Mode votre organisation peut :",
    features: [
      "Créer un espace dédié à l'organisation",
      "Inviter et gérer les membres",
      "Créer des départements, ministères et groupes",
      "Mettre en ligne des sermons et des annonces",
      "Recevoir des demandes de prière",
      "Gérer les événements, les tâches, les présences et les missions",
      "Communiquer avec les membres",
      "Gérer l'image de marque et les logos de l'organisation",
      "Proposer des options d'offrandes en ligne si disponibles",
      "Consulter l'activité et les informations de l'organisation",
      "Utiliser Church Mode en anglais, espagnol et français",
    ],
    statusLabel: "Statut de votre inscription :",
    pendingNote: "Notre équipe examinera votre inscription. Vous recevrez une notification dans l'application et par e-mail dès que l'examen sera terminé.",
    securityNote: "365 Daily Devotional ne vous demandera jamais d'envoyer votre mot de passe par e-mail.",
    closing: "Nous prions pour que cette plateforme aide votre organisation à se connecter, grandir, servir et affermir les croyants.",
    footer: "Bénédictions,<br><strong>Équipe 365 Daily Devotional</strong><br>365ddevotional@gmail.com<br><a href=\"https://365dailydevotional.com\" style=\"color:#9c6b30;\">365dailydevotional.com</a>",
  },
};

const PLATFORM_STATUS_LABELS: Record<string, Record<string, string>> = {
  en: { draft: "Draft — not yet submitted for review", submitted: "Submitted — awaiting review", pending_review: "Under Review", approved: "Approved — fully active", rejected: "Rejected — see in-app notices", suspended: "Suspended — restricted access" },
  es: { draft: "Borrador — aún no enviado para revisión", submitted: "Enviado — esperando revisión", pending_review: "En revisión", approved: "Aprobado — completamente activo", rejected: "Rechazado — ver avisos en la aplicación", suspended: "Suspendido — acceso restringido" },
  fr: { draft: "Brouillon — pas encore soumis", submitted: "Soumis — en attente de révision", pending_review: "En cours d'examen", approved: "Approuvé — entièrement actif", rejected: "Rejeté — voir les avis dans l'application", suspended: "Suspendu — accès restreint" },
};

export async function sendChurchWelcomeEmail(
  toEmail: string,
  ownerName: string,
  churchName: string,
  platformStatus: string,
  language: string = "en"
): Promise<{ success: boolean; status: string }> {
  const lang = ["en", "es", "fr"].includes(language) ? language : "en";
  const t = WELCOME_CONTENT[lang];
  const statusMap = PLATFORM_STATUS_LABELS[lang];
  const statusText = statusMap[platformStatus] ?? platformStatus;
  const isPending = ["draft", "submitted", "pending_review"].includes(platformStatus);

  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const featureListHtml = t.features.map(f => `<li style="margin: 6px 0; color:#444;">${f}</li>`).join("");
    const featureListText = t.features.map(f => `• ${f}`).join("\n");

    const html = `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;margin-bottom:30px;background:linear-gradient(135deg,#1d3461,#9c6b30);padding:30px;border-radius:8px;">
    <h1 style="color:#fff;margin:0;font-size:26px;">365 Daily Devotional</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:15px;">${t.heading}</p>
  </div>
  <p style="color:#333;font-size:16px;">${t.greeting} ${ownerName},</p>
  <p style="color:#333;font-size:15px;line-height:1.7;">${t.intro(churchName)}</p>
  <p style="color:#333;font-size:15px;font-weight:bold;margin-bottom:8px;">${t.featureHeader}</p>
  <ul style="padding-left:20px;margin:0 0 20px 0;">${featureListHtml}</ul>
  <div style="background:#f8f6f3;border-left:4px solid #9c6b30;padding:16px 20px;border-radius:4px;margin:20px 0;">
    <p style="margin:0 0 6px 0;font-size:14px;color:#666;font-weight:bold;">${t.statusLabel}</p>
    <p style="margin:0;font-size:15px;color:#1d3461;font-weight:bold;">${statusText}</p>
    ${isPending ? `<p style="margin:10px 0 0 0;font-size:14px;color:#555;">${t.pendingNote}</p>` : ""}
  </div>
  <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:4px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#7a5c00;">🔒 ${t.securityNote}</p>
  </div>
  <p style="color:#333;font-size:15px;line-height:1.7;margin-top:24px;">${t.closing}</p>
  <p style="color:#666;font-size:14px;margin-top:30px;line-height:1.8;">${t.footer}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
  <p style="color:#aaa;font-size:11px;text-align:center;">365 Daily Devotional · Supporting believers, churches, ministries, and Christian communities.</p>
  <div style="background:#f0f4ff;border:1px solid #dde5ff;border-radius:6px;padding:12px 16px;margin-top:16px;">
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">📬 <strong>Did not receive this email?</strong> Please check your <strong>Spam</strong>, <strong>Junk</strong>, <strong>Promotions</strong>, or <strong>Updates</strong> folder. You may also add <em>365ddevotional@gmail.com</em> to your contacts to ensure future emails arrive in your inbox.</p>
  </div>
</div>`;

    const text = `${t.greeting} ${ownerName},\n\n${t.intro(churchName)}\n\n${t.featureHeader}\n${featureListText}\n\n${t.statusLabel} ${statusText}\n${isPending ? t.pendingNote + "\n" : ""}\n🔒 ${t.securityNote}\n\n${t.closing}\n\n365 Daily Devotional Team\n365ddevotional@gmail.com\nhttps://365dailydevotional.com\n\n---\n📬 Did not receive this email? Check your Spam, Junk, Promotions, or Updates folder.\nYou may also add 365ddevotional@gmail.com to your contacts to ensure future emails arrive in your inbox.`;

    await client.send({
      to: toEmail,
      from: { name: "365 Daily Devotional", email: fromEmail },
      replyTo: "365ddevotional@gmail.com",
      subject: t.subject,
      text,
      html,
    });
    console.log(`[email] Church welcome sent to ${toEmail} (${lang})`);
    return { success: true, status: "accepted" };
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : String(error);
    console.error(`[email] Church welcome FAILED for ${toEmail}:`, detail);
    return { success: false, status: `failed:${detail.slice(0, 200)}` };
  }
}

// ─── Church Mode: Compliance Event Email ──────────────────────────────────────

export type ComplianceEmailEvent =
  | "case_opened"
  | "case_status_changed"
  | "enforcement_warning"
  | "enforcement_suspension"
  | "enforcement_removal"
  | "org_approved"
  | "org_rejected"
  | "org_suspended"
  | "org_restored"
  | "deadline_assigned"
  | "case_resolved";

const COMPLIANCE_EVENT_LABELS: Record<ComplianceEmailEvent, { subject: (org: string, ref?: string) => string; heading: string; color: string }> = {
  case_opened:            { subject: (org, ref) => `Compliance Notice — Case ${ref} | ${org}`, heading: "A Compliance Case Has Been Opened", color: "#c0392b" },
  case_status_changed:    { subject: (org, ref) => `Case Update — ${ref} | ${org}`, heading: "Your Compliance Case Has Been Updated", color: "#2980b9" },
  enforcement_warning:    { subject: (org, ref) => `Official Warning — Case ${ref} | ${org}`, heading: "Official Warning Issued", color: "#e67e22" },
  enforcement_suspension: { subject: (org) => `Organization Suspended — ${org}`, heading: "Your Organization Has Been Suspended", color: "#c0392b" },
  enforcement_removal:    { subject: (org) => `Organization Removed — ${org}`, heading: "Your Organization Has Been Removed from the Platform", color: "#7f1d1d" },
  org_approved:           { subject: (org) => `Your Organization Is Approved — ${org}`, heading: "Registration Approved", color: "#16a34a" },
  org_rejected:           { subject: (org) => `Registration Update — ${org}`, heading: "Registration Decision", color: "#b45309" },
  org_suspended:          { subject: (org) => `Organization Suspended — ${org}`, heading: "Your Organization Has Been Suspended", color: "#c0392b" },
  org_restored:           { subject: (org) => `Organization Restored — ${org}`, heading: "Your Organization Has Been Restored", color: "#16a34a" },
  deadline_assigned:      { subject: (org, ref) => `Response Deadline Set — Case ${ref} | ${org}`, heading: "A Response Deadline Has Been Assigned", color: "#7c3aed" },
  case_resolved:          { subject: (org, ref) => `Case Resolved — ${ref} | ${org}`, heading: "Your Compliance Case Has Been Resolved", color: "#16a34a" },
};

export async function sendChurchComplianceEmail(opts: {
  toEmail: string;
  ownerName: string;
  churchName: string;
  event: ComplianceEmailEvent;
  caseNumber?: string;
  category?: string;
  severity?: string;
  description?: string;
  newStatus?: string;
  deadline?: Date | null;
  baseUrl?: string;
}): Promise<{ success: boolean; status: string }> {
  const { toEmail, ownerName, churchName, event, caseNumber, category, severity, description, newStatus, deadline, baseUrl = "https://365dailydevotional.com" } = opts;
  const meta = COMPLIANCE_EVENT_LABELS[event];
  const subject = meta.subject(churchName, caseNumber);
  const deadlineStr = deadline ? deadline.toUTCString() : null;

  const detailRows = [
    caseNumber   ? `<tr><td style="padding:4px 8px;color:#666;font-size:13px;">Case reference:</td><td style="padding:4px 8px;font-size:13px;font-weight:bold;">${caseNumber}</td></tr>` : "",
    category     ? `<tr><td style="padding:4px 8px;color:#666;font-size:13px;">Category:</td><td style="padding:4px 8px;font-size:13px;">${category}</td></tr>` : "",
    severity     ? `<tr><td style="padding:4px 8px;color:#666;font-size:13px;">Severity:</td><td style="padding:4px 8px;font-size:13px;">${severity}</td></tr>` : "",
    newStatus    ? `<tr><td style="padding:4px 8px;color:#666;font-size:13px;">Status:</td><td style="padding:4px 8px;font-size:13px;">${newStatus}</td></tr>` : "",
    deadlineStr  ? `<tr><td style="padding:4px 8px;color:#666;font-size:13px;">Response deadline:</td><td style="padding:4px 8px;font-size:13px;color:#c0392b;font-weight:bold;">${deadlineStr}</td></tr>` : "",
  ].filter(Boolean).join("");

  const detailText = [
    caseNumber  ? `Case reference: ${caseNumber}` : "",
    category    ? `Category: ${category}` : "",
    severity    ? `Severity: ${severity}` : "",
    newStatus   ? `Status: ${newStatus}` : "",
    deadlineStr ? `Response deadline: ${deadlineStr}` : "",
  ].filter(Boolean).join("\n");

  const bodyNote = description
    ? `<p style="color:#444;font-size:15px;line-height:1.7;margin:16px 0;">${description}</p>`
    : "";
  const bodyNoteText = description ? `\n${description}\n` : "";

  const html = `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;margin-bottom:24px;background:linear-gradient(135deg,#1d3461,#9c6b30);padding:24px;border-radius:8px;">
    <h1 style="color:#fff;margin:0;font-size:24px;">365 Daily Devotional</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:13px;">Church Mode — Governance &amp; Compliance</p>
  </div>
  <div style="background:${meta.color}15;border-left:4px solid ${meta.color};padding:14px 18px;border-radius:4px;margin-bottom:20px;">
    <p style="margin:0;font-size:16px;font-weight:bold;color:${meta.color};">${meta.heading}</p>
  </div>
  <p style="color:#333;font-size:15px;">Dear ${ownerName},</p>
  <p style="color:#333;font-size:15px;line-height:1.7;">This message relates to your organization <strong>${churchName}</strong> on 365 Daily Devotional.</p>
  ${detailRows ? `<table style="border-collapse:collapse;width:100%;margin:16px 0;background:#f8f6f3;border-radius:4px;">${detailRows}</table>` : ""}
  ${bodyNote}
  <p style="color:#444;font-size:14px;line-height:1.7;">Full case details, any required actions, and your response options are available after signing in to your organization administration panel.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${baseUrl}/church-mode" style="display:inline-block;background:#1d3461;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">View in Church Mode</a>
  </div>
  <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0;">
    <p style="margin:0;font-size:12px;color:#7a5c00;">🔒 365 Daily Devotional will never ask you to send your password by email. Do not share login credentials with anyone.</p>
  </div>
  <p style="color:#666;font-size:13px;margin-top:28px;line-height:1.8;">With prayers,<br><strong>365 Daily Devotional Team</strong><br>365ddevotional@gmail.com<br><a href="https://365dailydevotional.com" style="color:#9c6b30;">365dailydevotional.com</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="color:#aaa;font-size:11px;text-align:center;">365 Daily Devotional · Supporting believers, churches, ministries, and Christian communities.<br>This is an automated governance notification. Please do not reply to this email.</p>
  <div style="background:#f0f4ff;border:1px solid #dde5ff;border-radius:6px;padding:12px 16px;margin-top:12px;">
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">📬 <strong>Did not receive this email?</strong> Please check your <strong>Spam</strong>, <strong>Junk</strong>, <strong>Promotions</strong>, or <strong>Updates</strong> folder. You may also add <em>365ddevotional@gmail.com</em> to your contacts to ensure future emails arrive in your inbox.</p>
  </div>
</div>`;

  const text = `Dear ${ownerName},\n\n${meta.heading}\n\nOrganization: ${churchName}\n${detailText}${bodyNoteText}\nFull case details and your response options are available after signing in at:\n${baseUrl}/church-mode\n\n🔒 365 Daily Devotional will never ask you to send your password by email.\n\nWith prayers,\n365 Daily Devotional Team\n365ddevotional@gmail.com\nhttps://365dailydevotional.com\n\nThis is an automated governance notification.\n\n---\n📬 Did not receive this email? Check your Spam, Junk, Promotions, or Updates folder.\nYou may also add 365ddevotional@gmail.com to your contacts to ensure future emails arrive in your inbox.`;

  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({
      to: toEmail,
      from: { name: "365 Daily Devotional", email: fromEmail },
      replyTo: "365ddevotional@gmail.com",
      subject,
      text,
      html,
    });
    console.log(`[email] Compliance email (${event}) sent to ${toEmail}`);
    return { success: true, status: "accepted" };
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : String(error);
    console.error(`[email] Compliance email (${event}) FAILED for ${toEmail}:`, detail);
    return { success: false, status: `failed:${detail.slice(0, 200)}` };
  }
}

// ─── Contact auto-reply ────────────────────────────────────────────────────────

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
