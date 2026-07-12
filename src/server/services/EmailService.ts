import { Resend } from 'resend';
import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { TemplateEngine } from '../utils/TemplateEngine';

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not defined.");
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export type EmailType = 
  | 'LOGIN_ALERT' 
  | 'OTP' 
  | 'PASSWORD_RESET' 
  | 'EMAIL_VERIFICATION' 
  | 'TRANSACTION_CONFIRMATION' 
  | 'WITHDRAWAL_ALERT' 
  | 'DEPOSIT_ALERT' 
  | 'KYC_UPDATE' 
  | 'INVESTMENT_ALERT' 
  | 'SECURITY_ALERT' 
  | 'WELCOME' 
  | 'SUPPORT_REPLY' 
  | 'NEWSLETTER';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  type: EmailType;
}

export class EmailService {
  private static getBaseDomain() {
    return process.env.RESEND_FROM_DOMAIN || "goldencoin.live";
  }

  private static getFromAddress(prefix: string, displayName?: string) {
    const domain = this.getBaseDomain();
    const email = `${prefix}@${domain}`;
    return displayName ? `${displayName} <${email}>` : email;
  }

  private static getFrontendUrl() {
    const url = process.env.FRONTEND_URL || 'https://goldencoin.live';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  static async sendEmail(options: EmailOptions) {
    const { to, subject, html, from, type } = options;
    const sender = from || this.getFromAddress("noreply");
    
    const client = getResendClient();
    if (!client) {
      const errorMsg = "[EmailService]: Resend client not initialized. Check RESEND_API_KEY.";
      console.error(errorMsg);
      if (type === 'OTP' || type === 'PASSWORD_RESET') {
        throw new Error(errorMsg);
      }
      console.warn(`[EmailService Warning]: Failed to send ${type} email because Resend client is not initialized, but proceeding without throwing.`);
      return { success: false, error: errorMsg };
    }

    console.log(`[EmailService]: Attempting to send ${type} email to ${to} from ${sender}...`);

    try {
      const response = await client.emails.send({
        from: sender,
        to: [to],
        subject,
        html,
      });

      const { data, error } = response;

      if (error) {
        console.error(`[EmailService Resend Error]:`, error);
        // Special warning for unverified domains
        if (error.message.includes("not verified") || error.message.includes("onboarding")) {
           console.warn("[EmailService Help]: It looks like your domain is not verified in Resend. Please verify it or use 'onboarding@resend.dev' for testing.");
        }
        throw new Error(error.message);
      } else {
        console.log(`[EmailService Success]: Email sent! ID: ${data?.id}`);
      }

      // Log the email in database
      if (db) {
        try {
          await db.collection('emailLogs').add({
            recipient: to,
            subject,
            type,
            status: 'SENT',
            messageId: data?.id || null,
            createdAt: new Date(),
          });
        } catch (dbErr: any) {
          console.error(`[EmailService DB Error]: Failed to log email for ${to}. Error:`, dbErr.message);
        }
      }

      return data;
    } catch (err: any) {
      console.error("[EmailService Exception]:", err);
      // Log failure in DB
      if (db) {
        try {
          await db.collection('emailLogs').add({
            recipient: to,
            subject,
            type,
            status: 'FAILED',
            error: err.message || JSON.stringify(err),
            createdAt: new Date(),
          });
        } catch (dbErr: any) {}
      }
      if (type === 'OTP' || type === 'PASSWORD_RESET') {
        throw err;
      }
      console.warn(`[EmailService Warning]: Failed to send ${type} email, but proceeding without throwing error:`, err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  }


  // Domain specific email methods
  static async sendLoginAlert(user: any, details: any) {
    const isNewDevice = details.isNewDevice !== false;
    let deviceLabel = "new";
    if (details.isSuspicious) {
      deviceLabel = "unrecognized/suspicious";
    } else if (!isNewDevice) {
      deviceLabel = "recognized/existing";
    }

    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>We detected a login to your Golden Coin account from a <span style="font-weight: bold; color: ${details.isSuspicious ? '#d9534f' : '#C9A96E'};">${deviceLabel}</span> device.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
        <p style="margin: 0 0 10px;"><strong>Status:</strong> ${details.isSuspicious ? '⚠️ Suspicious Login' : (!isNewDevice ? 'Standard Login (Recognized Device)' : 'New Device Sign-in')}</p>
        <p style="margin: 0 0 10px;"><strong>Time:</strong> ${details.time}</p>
        <p style="margin: 0 0 10px;"><strong>IP Address:</strong> ${details.ip}</p>
        <p style="margin: 0 0 10px;"><strong>Location:</strong> ${details.location}</p>
        <p style="margin: 0 0 10px;"><strong>Device:</strong> ${details.deviceString || details.device}</p>
        <p style="margin: 0;"><strong>Browser:</strong> ${details.browser}</p>
      </div>
      <p>If this was you, no action is needed. If this was not you, please secure your account immediately by changing your password and enabling 2FA.</p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${this.getFrontendUrl()}/profile/security" class="hover-bg-gold" style="background-color: #C9A96E; color: #0B0B0B; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Secure My Account</a>
      </div>
      <p style="font-size: 14px; color: #666;">You can also <a href="${this.getFrontendUrl()}/revoke-session?id=${details.deviceId}" style="color: #C9A96E;">revoke this session</a> directly.</p>
    `;

    const html = TemplateEngine.render({
      title: details.isSuspicious ? "Security Alert: Suspicious Login" : "Login Alert",
      content,
      preheader: `A login was detected on your account from a ${deviceLabel} device.`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: details.isSuspicious ? "⚠️ Suspicious Login Alert" : "Login Detection Alert",
      html,
      from: this.getFromAddress("security", "Goldencoin Security"),
      type: 'LOGIN_ALERT'
    });
  }

  static async sendOTP(user: any, code: string, purpose: string) {
    const content = `
      <div style="text-align: center;">
        <p>Hello ${user.firstName || 'User'},</p>
        <p>Your verification code for <strong>${purpose}</strong> is:</p>
        <div style="background-color: #f4f4f4; border-radius: 12px; padding: 30px; margin: 25px 0;">
          <h2 style="font-size: 42px; letter-spacing: 12px; color: #C9A96E; margin: 0; font-family: monospace;">${code}</h2>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p style="font-size: 14px; color: #888; margin-top: 25px;">If you did not request this verification, please ignore this email or contact support if you suspect unauthorized access.</p>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Verification Code",
      content,
      preheader: `Your Golden Coin verification code is ${code}`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `[Golden Coin] ${code} is your verification code`,
      html,
      from: this.getFromAddress("noreply", "Goldencoin"),
      type: 'OTP'
    });
  }

  static async sendTransactionAlert(user: any, tx: any) {
    const isSuccess = tx.status === 'SUCCESS' || tx.status === 'APPROVED';
    const isRejected = tx.status === 'REJECTED' || tx.status === 'FAILED';
    const accentColor = isSuccess ? '#28a745' : (isRejected ? '#d9534f' : '#C9A96E');

    const amount = tx.amount ?? tx.amountUsd ?? 0;
    const date = tx.createdAt ? new Date(tx.createdAt) : (tx.timestamp ? new Date(tx.timestamp) : new Date());

    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>Your <strong>${tx.type}</strong> request status has been updated to <span style="color: ${accentColor}; font-weight: bold;">${tx.status}</span>.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
        <p style="margin: 0 0 10px;"><strong>Amount:</strong> $${Number(amount).toLocaleString()}</p>
        <p style="margin: 0 0 10px;"><strong>Type:</strong> ${tx.type}</p>
        <p style="margin: 0 0 10px;"><strong>Status:</strong> ${tx.status}</p>
        <p style="margin: 0 0 10px;"><strong>Reference:</strong> ${tx.reference || tx.id || tx.txId}</p>
        ${tx.rejectionReason ? `<p style="margin: 10px 0 0; color: #d9534f;"><strong>Reason:</strong> ${tx.rejectionReason}</p>` : ''}
        <p style="margin: 10px 0 0; font-size: 14px; color: #888;"><strong>Date:</strong> ${date.toLocaleString()}</p>
      </div>
      <p>You can view full details in your transaction history.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.getFrontendUrl()}/transactions" style="background-color: #0B0B0B; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View History</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Transaction Update",
      headerColor: accentColor,
      headerTextColor: '#ffffff',
      content,
      email: user.email
    });

    const subject = `Transaction ${tx.status}: ${tx.type} ($${Number(amount).toLocaleString()})`;
    const type = tx.type === 'DEPOSIT' ? 'DEPOSIT_ALERT' : (tx.type === 'WITHDRAWAL' ? 'WITHDRAWAL_ALERT' : 'TRANSACTION_CONFIRMATION');

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      from: this.getFromAddress("transactions", "Goldencoin Transactions"),
      type
    });
  }

  static async sendPasswordReset(user: any, token: string) {
    const resetLink = `${this.getFrontendUrl()}/reset-password?token=${token}`;
    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>We received a request to reset your password for your Golden Coin account. If you did not make this request, you can safely ignore this email.</p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetLink}" class="hover-bg-gold" style="background-color: #C9A96E; color: #0B0B0B; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 14px; word-break: break-all;"><a href="${resetLink}" style="color: #C9A96E;">${resetLink}</a></p>
      <p style="font-size: 13px; color: #999; margin-top: 25px;">This link will expire in 1 hour for security reasons.</p>
    `;

    const html = TemplateEngine.render({
      title: "Password Reset Request",
      content,
      preheader: "Reset your Golden Coin password",
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: "Reset your Golden Coin password",
      html,
      from: this.getFromAddress("security", "Goldencoin Security"),
      type: 'PASSWORD_RESET'
    });
  }

  static async sendKYCAlert(user: any, status: 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'verified' | 'rejected' | 'pending', reason?: string) {
    const normalizedStatus = status.toUpperCase() as 'APPROVED' | 'REJECTED' | 'SUBMITTED';
    const statusText = normalizedStatus === 'APPROVED' ? 'Approved' : normalizedStatus === 'REJECTED' ? 'Rejected' : 'Submitted';
    const headerColor = normalizedStatus === 'APPROVED' ? '#28a745' : (normalizedStatus === 'REJECTED' ? '#d9534f' : '#C9A96E');

    let message = '';
    if (normalizedStatus === 'APPROVED') {
      message = `<p>Congratulations! Your identity verification has been <strong>approved</strong>. You now have full access to all Golden Coin features, including higher limits and faster withdrawals.</p>`;
    } else if (normalizedStatus === 'REJECTED') {
      message = `
        <p>Unfortunately, your identity verification could not be approved at this time.</p>
        <div style="background-color: #fff5f5; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #c53030;"><strong>Reason:</strong> ${reason || 'Document clarity or mismatch issue'}</p>
        </div>
        <p>Please ensure your documents are valid, clear, and match your profile details before submitting again.</p>
      `;
    } else {
      message = `<p>We have received your KYC documents. Our compliance team is currently reviewing them to ensure account security. We will notify you via email as soon as the review is complete.</p>`;
    }

    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      ${message}
      <div style="text-align: center; margin-top: 35px;">
        <a href="${this.getFrontendUrl()}/kyc" style="background-color: #0B0B0B; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          ${status === 'REJECTED' ? 'Submit Again' : 'Go to KYC Dashboard'}
        </a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: `KYC Status: ${statusText}`,
      headerColor,
      headerTextColor: '#ffffff',
      content,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `KYC Verification ${statusText}`,
      html,
      from: this.getFromAddress("support", "Goldencoin Support"),
      type: 'KYC_UPDATE'
    });
  }

  static async sendSecurityAlert(user: any, activity: string) {
    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>A recent change was made to your Golden Coin account security settings or profile details.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee; font-weight: bold; color: #0B0B0B;">
         ${activity}
      </div>
      <p>If you made this change, you can safely ignore this email.</p>
      <p style="color: #d9534f; font-weight: bold;">If you did NOT make this change, please secure your account immediately.</p>
      <div style="text-align: center; margin-top: 35px;">
        <a href="${this.getFrontendUrl()}/profile/security" class="hover-bg-gold" style="background-color: #C9A96E; color: #0B0B0B; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Secure Account</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Security Notification",
      headerColor: '#0B0B0B',
      headerTextColor: '#C9A96E',
      content,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `Security Alert: ${activity}`,
      html,
      from: this.getFromAddress("security", "Goldencoin Security"),
      type: 'SECURITY_ALERT'
    });
  }

  static async sendAdminEmailNotification(subject: string, message: string) {
    const adminEmail = process.env.ADMIN_EMAIL || "support@goldencoin.live";
    const content = `
      <p><strong>Administrative Notification</strong></p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="font-size: 12px; color: #888;">This is an automated system notification.</p>
    `;

    const html = TemplateEngine.render({
      title: "Admin Alert",
      content,
      preheader: `Admin Alert: ${subject}`,
      email: adminEmail
    });

    return this.sendEmail({
      to: adminEmail,
      subject: `[ADMIN ALERT] ${subject}`,
      html,
      from: this.getFromAddress("system", "Goldencoin System"),
      type: 'SECURITY_ALERT'
    });
  }

  static async sendSupportTicketAlert(user: any, ticket: any) {
    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>We have received your support request regarding <strong>${ticket.subject}</strong>.</p>
      <p>Our support team is reviewing your ticket and will provide a response as soon as possible.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
        <p style="margin: 0 0 10px;"><strong>Ticket Number:</strong> ${ticket.ticketNumber || ticket.id}</p>
        <p style="margin: 0;"><strong>Status:</strong> ${ticket.status}</p>
      </div>
      <p>You can track the progress of your ticket and respond to our team directly on our self-help portal.</p>
      <div style="text-align: center; margin-top: 35px;">
        <a href="${this.getFrontendUrl()}/self-help" style="background-color: #0B0B0B; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Help Center</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Support Ticket Received",
      content,
      preheader: `Ticket #${ticket.ticketNumber || ticket.id} received: ${ticket.subject}`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `[${ticket.ticketNumber || 'Ticket'}] Support Request Received: ${ticket.subject}`,
      html,
      from: this.getFromAddress("support", "Goldencoin Support"),
      type: 'SUPPORT_REPLY'
    });
  }

  static async sendSupportReply(user: any, ticket: any, message: string) {
    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>An administrator has replied to your support ticket regarding <strong>${ticket.subject}</strong>.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee; font-style: italic;">
        "${message}"
      </div>
      <p>Please visit our self-help portal to view the full conversation and provide any additional information if needed.</p>
      <div style="text-align: center; margin-top: 35px;">
        <a href="${this.getFrontendUrl()}/self-help" class="hover-bg-gold" style="background-color: #C9A96E; color: #0B0B0B; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Conversation</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "New Support Reply",
      content,
      preheader: `New response for Ticket #${ticket.ticketNumber || ticket.id}`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `Re: [${ticket.ticketNumber || 'Ticket'}] New Reply to your support request`,
      html,
      from: this.getFromAddress("support", "Goldencoin Support"),
      type: 'SUPPORT_REPLY'
    });
  }

  static async sendInvestmentAlert(user: any, investment: any) {
    const amount = investment.amount ?? investment.amountUsd ?? 0;
    const expectedReturn = investment.expectedReturn ?? investment.expectedReturnUsd ?? 0;
    const content = `
      <p>Hello ${user.firstName || 'User'},</p>
      <p>Congratulations! You have successfully invested in the <strong>${investment.planName}</strong> plan. Your capital is now working for you.</p>
      <div class="card" style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
        <p style="margin: 0 0 10px;"><strong>Plan:</strong> ${investment.planName}</p>
        <p style="margin: 0 0 10px;"><strong>Invested Amount:</strong> $${Number(amount).toLocaleString()}</p>
        <p style="margin: 0 0 10px;"><strong>ROI:</strong> ${investment.roiPercentage || ((Number(expectedReturn)/Number(amount) - 1) * 100).toFixed(0)}%</p>
        <p style="margin: 0 0 10px;"><strong>Expected Payout:</strong> $${Number(expectedReturn).toLocaleString()}</p>
        <p style="margin: 0;"><strong>Maturity Date:</strong> ${new Date(investment.endDate || investment.endTime).toLocaleDateString()}</p>
      </div>
      <p>Your profits will be automatically credited to your main balance upon maturity.</p>
      <div style="text-align: center; margin-top: 35px;">
        <a href="${this.getFrontendUrl()}/invest" style="background-color: #0B0B0B; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Manage Investments</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Investment Confirmed",
      content,
      preheader: `Success! You invested $${Number(amount).toLocaleString()} in ${investment.planName}`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: `Investment Plan Purchased: ${investment.planName}`,
      html,
      from: this.getFromAddress("invest", "Goldencoin Investment"),
      type: 'INVESTMENT_ALERT'
    });
  }

  static async sendWelcomeEmail(user: any) {
    const displayName = user.firstName || user.displayName || 'User';
    const content = `
      <p>Hello ${displayName},</p>
      <p>We are absolutely thrilled to welcome you to <strong>Golden Coin</strong>. You've taken your first step towards smarter, high-yield digital asset investments.</p>
      <p>With your new account, you can access premium investment strategies, secure asset growth, and professional-grade financial tools.</p>
      <div style="background-color: #f9f9f9; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #C9A96E;">Quick Start Guide:</h3>
        <ul style="padding-left: 20px; color: #444;">
          <li style="margin-bottom: 10px;"><strong>Verify Account:</strong> Submit your KYC to unlock full withdrawal limits.</li>
          <li style="margin-bottom: 10px;"><strong>Deposit Funds:</strong> We support multiple cryptocurrencies and methods.</li>
          <li style="margin-bottom: 0;"><strong>Active Plan:</strong> Choose a plan that fits your financial goals.</li>
        </ul>
      </div>
      <p>If you need any guidance, our 24/7 concierge support is just a ticket away.</p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${this.getFrontendUrl()}/dashboard" class="hover-bg-gold" style="background-color: #C9A96E; color: #0B0B0B; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block; font-size: 18px;">Start Investing Now</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Welcome to the Future of Investing",
      content,
      preheader: `Welcome to Golden Coin, ${displayName}! Let's grow your wealth together.`,
      email: user.email
    });

    return this.sendEmail({
      to: user.email,
      subject: "Welcome to Golden Coin!",
      html,
      from: this.getFromAddress("welcome", "Goldencoin"),
      type: 'WELCOME'
    });
  }

  static async sendNewsletterEmail(email: string) {
    const content = `
      <p>Hello,</p>
      <p><strong>Success!</strong> You have successfully subscribed to the Golden Coin newsletter.</p>
      <p>You will now receive regular updates, expert digital asset insights, and special announcements directly to your inbox, keeping you informed of all the latest opportunities.</p>
      <p>Thank you for joining our community.</p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${this.getFrontendUrl()}/dashboard" style="background-color: #C9A96E; color: #0B0B0B; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block; font-size: 18px;">Visit Dashboard</a>
      </div>
    `;

    const html = TemplateEngine.render({
      title: "Welcome to Golden Coin Newsletter",
      content,
      preheader: "Thank you for subscribing to Golden Coin updates.",
      email: email
    });

    return this.sendEmail({
      to: email,
      subject: "Welcome to Golden Coin Newsletter!",
      html,
      from: this.getFromAddress("newsletter", "Goldencoin Newsletter"),
      type: 'NEWSLETTER'
    });
  }
}
