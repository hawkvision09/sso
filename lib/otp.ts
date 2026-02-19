import nodemailer from 'nodemailer';
import { SMTP_CONFIG, APP_CONFIG } from '@/lib/config';
import { 
  SHEET_NAMES, 
  appendRow, 
  findRowByColumn,
  deleteRowsByColumn 
} from '@/lib/sheets';

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
export async function sendOTP(email: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
  });

  const mailOptions = {
    from: `"${APP_CONFIG.name}" <${SMTP_CONFIG.user}>`,
    to: email,
    subject: `Your ${APP_CONFIG.name} Login Code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .otp-box {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #667eea;
            margin: 20px 0;
          }
          .footer {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-top: 20px;
          }
          h1 {
            color: white;
            margin: 0 0 10px 0;
          }
          p {
            color: rgba(255, 255, 255, 0.9);
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Login Verification</h1>
          <p>Your one-time password for ${APP_CONFIG.name}</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="color: #666; margin: 0;">This code expires in ${APP_CONFIG.otpExpiryMinutes} minutes</p>
          </div>
          
          <div class="footer">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>© ${new Date().getFullYear()} ${APP_CONFIG.name}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// Store OTP in database
export async function storeOTP(email: string, otp: string): Promise<void> {
  const expiresAt = new Date(
    Date.now() + APP_CONFIG.otpExpiryMinutes * 60 * 1000
  ).toISOString();
  
  // Delete any existing OTPs for this email first
  await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
  
  await appendRow(SHEET_NAMES.OTPS, [
    email,
    otp,
    expiresAt,
    new Date().toISOString(),
  ]);
}

// Verify OTP and delete it immediately after verification
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const otpRecord = await findRowByColumn(SHEET_NAMES.OTPS, 'email', email);
  
  if (!otpRecord) {
    return false;
  }
  
  // Check if OTP matches
  if (otpRecord.otp_code !== otp) {
    return false;
  }
  
  // Check if expired
  if (new Date(otpRecord.expires_at) < new Date()) {
    // Delete expired OTP
    await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
    return false;
  }
  
  // KEY REQUIREMENT: Delete OTP immediately after successful verification
  await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
  
  return true;
}

// Clean up expired OTPs (can be called periodically)
export async function cleanupExpiredOTPs(): Promise<void> {
  const sheets = await import('./sheets');
  const otps = await sheets.getRows(SHEET_NAMES.OTPS);
  
  const now = new Date();
  for (const otp of otps) {
    if (new Date(otp.expires_at) < now) {
      await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', otp.email);
    }
  }
}
