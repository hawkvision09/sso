# HawkVision SSO v2 - Setup Guide

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Google account
- A Gmail account (for sending OTP emails)
- Basic knowledge of Next.js and TypeScript

## Step-by-Step Setup

### 1. Google Cloud Project Setup

#### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "HawkVision SSO" (or your preferred name)
4. Click "Create"

#### Enable Google Sheets API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

#### Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Name: `sso-service-account`
4. Click "Create and Continue"
5. Skip optional steps, click "Done"

#### Generate Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create" - a JSON file will download
6. **Keep this file secure!**

### 2. Google Sheets Setup

#### Create the Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new blank spreadsheet
3. Name it "HawkVision SSO Database"
4. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

#### Share with Service Account

1. Click the "Share" button in your spreadsheet
2. Paste the service account email from the JSON file (looks like `xxx@xxx.iam.gserviceaccount.com`)
3. Give it "Editor" access
4. Uncheck "Notify people"
5. Click "Share"

### 3. Gmail SMTP Setup

#### Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled

#### Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Name it "HawkVision SSO"
4. Click "Generate"
5. Copy the 16-character password (remove spaces)
6. **Save this password securely!**

### 4. Project Setup

#### Clone/Download the Project

```bash
cd "c:\Users\Ivan\Downloads\ab\New folder (2)\sso-v2"
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

1. Copy `.env.local` to create your configuration
2. Open `.env.local` in a text editor

#### Fill in the Environment Variables

```env
# Google Sheets Configuration
SPREADSHEET_ID=paste_your_spreadsheet_id_here
SERVICE_ACCOUNT_EMAIL=paste_service_account_email_here
SERVICE_ACCOUNT_KEY="paste_private_key_here_with_quotes"

# JWT Secret (Generate a random string)
JWT_SECRET=generate_a_random_secret_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your_16_char_app_password_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
APP_NAME=HawkVision SSO
SESSION_DURATION_DAYS=30
OTP_EXPIRY_MINUTES=10
AUTH_CODE_EXPIRY_SECONDS=60
```

#### Important: Format the Private Key Correctly

The `SERVICE_ACCOUNT_KEY` from your JSON file needs to be formatted correctly:

**Original in JSON:**

```json
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

**In .env.local (keep the \n as literal characters):**

```env
SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

**DO NOT** replace `\n` with actual line breaks. Keep them as `\n`.

#### Generate JWT Secret

Use this command to generate a secure random secret:

**Windows PowerShell:**

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Or use an online generator:**

- Visit https://randomkeygen.com/
- Copy a "Fort Knox Password"

### 5. Initialize the Database

#### Start the Development Server

```bash
npm run dev
```

The app should start on `http://localhost:3001`

#### Initialize Google Sheets

1. Open your browser
2. Visit: `http://localhost:3001/api/init`
3. You should see: `{"success":true,"message":"Sheets initialized successfully"}`
4. Check your Google Sheet - it should now have 6 tabs:
   - Users
   - Sessions
   - Services
   - Entitlements
   - OTPs
   - AuthCodes

### 6. Create Your First Admin User

#### Login with Any Email

1. Visit `http://localhost:3001/login`
2. Enter your email
3. Check your email for the OTP code
4. Enter the code
5. You should be logged in!

#### Make Yourself Admin

1. Go to your Google Sheet
2. Open the "Users" tab
3. Find your row
4. Change the "role" column from `user` to `admin`
5. Save

#### Verify Admin Access

1. Refresh the dashboard
2. You should now see an "Admin Panel" card
3. Click "Go to Admin"

### 7. Create Your First Service

1. In the Admin Panel, click "+ Add New Service"
2. Fill in the form:
   - **Name**: Test Application
   - **Description**: My test app
   - **Redirect URL**: `http://localhost:3000/auth/callback`
   - **Free Tier**: ✓ Enabled
3. Click "Create Service"
4. Copy the Service ID and Authorization URL

### 8. Test the SSO Flow

#### Manual Test

1. Copy the Authorization URL from the admin panel
2. Paste it in a new browser tab
3. You should be redirected back to the callback URL with a code parameter
4. The code will be in the URL: `?code=xxx-xxx-xxx`

#### Integration Test

Follow the `INTEGRATION_GUIDE.md` to integrate a test application.

## Troubleshooting

### Issue: "Missing Service Account Credentials"

**Solution**: Check that your `.env.local` file has the correct `SERVICE_ACCOUNT_EMAIL` and `SERVICE_ACCOUNT_KEY`.

### Issue: "Error initializing sheets"

**Solution**:

1. Verify the spreadsheet is shared with the service account email
2. Check that Google Sheets API is enabled
3. Verify the `SPREADSHEET_ID` is correct

### Issue: "Failed to send OTP"

**Solution**:

1. Verify Gmail SMTP credentials are correct
2. Check that you're using an App Password, not your regular password
3. Ensure 2FA is enabled on your Google account
4. Try sending a test email using the same credentials

### Issue: Private Key Error

**Solution**:
The private key must include `\n` as literal characters, not actual newlines:

```env
SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### Issue: "Cannot find module"

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3001 already in use

**Solution**:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change the port
npm run dev -- -p 3002
```

## Production Deployment

### Environment Variables

Ensure all environment variables are set in your production environment:

- Use a strong, random `JWT_SECRET`
- Set `NEXT_PUBLIC_APP_URL` to your production domain
- Use HTTPS in production

### Security Checklist

- [ ] JWT_SECRET is strong and random
- [ ] All secrets are stored securely (not in code)
- [ ] HTTPS is enabled
- [ ] Service account JSON is not committed to git
- [ ] CORS is configured if needed
- [ ] Rate limiting is implemented for login endpoints
- [ ] Monitoring is set up for failed login attempts

### Deployment Platforms

#### Vercel (Recommended)

1. Push your code to GitHub (without .env.local)
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

#### Other Platforms

The app is a standard Next.js application and can be deployed to:

- AWS (Amplify, EC2, ECS)
- Google Cloud (Cloud Run, App Engine)
- Azure (App Service)
- DigitalOcean
- Railway
- Render

## Maintenance

### Regular Tasks

1. **Monitor OTP usage**: Check for unusual patterns
2. **Review sessions**: Periodically clean up old sessions
3. **Audit services**: Ensure only authorized services are registered
4. **Check logs**: Monitor for errors or security issues

### Backup

Your data is in Google Sheets, which has built-in version history:

1. File → Version history → See version history
2. You can restore any previous version

Consider exporting the sheet periodically:

1. File → Download → Microsoft Excel (.xlsx)

## Support

For issues:

1. Check the logs in the terminal
2. Review the README.md
3. Check the INTEGRATION_GUIDE.md for client app issues
4. Verify all environment variables are set correctly

## Next Steps

1. ✅ Complete setup
2. ✅ Create admin user
3. ✅ Create test service
4. 📝 Integrate your first application (see INTEGRATION_GUIDE.md)
5. 🚀 Deploy to production

---

Congratulations! Your SSO system is ready to use! 🎉
