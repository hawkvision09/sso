# HawkVision SSO v2 - Complete Implementation

## Overview

This is a production-ready Single Sign-On (SSO) system built with Next.js, TypeScript, and Google Sheets as the database. It implements a secure, OAuth-like authorization flow for client applications.

## Key Features

### ✅ Implemented Requirements

1. **Centralized Authentication** - All applications rely on this SSO for user authorization
2. **Google Sheets Database** - All data stored in Google Sheets (Users, Sessions, Services, etc.)
3. **OAuth-like Flow** - Applications redirect to `/authorize`, users authenticate, and get redirected back with an authorization code
4. **Immediate OTP Deletion** - OTP rows are deleted immediately after verification (success or failure)
5. **One Session Per User** - When a new session is created, all previous sessions for that user are deleted
6. **Auto-Cleanup** - Expired sessions and codes are automatically cleaned up

### 🔐 Security Features

- **Passwordless Authentication** - Email-based OTP (6-digit code)
- **JWT Tokens** - HTTP-only cookies for session management
- **Session Validation** - Every request validates both JWT and database session
- **Authorization Codes** - Short-lived (60 seconds), single-use codes for client apps
- **Free Tier Support** - Auto-grant access to services with free tier enabled

## Architecture

### Data Model (Google Sheets)

#### 1. Users Sheet

| user_id | email            | role       | created_at    | status           |
| ------- | ---------------- | ---------- | ------------- | ---------------- |
| UUID    | user@example.com | admin/user | ISO timestamp | active/suspended |

#### 2. Sessions Sheet

| session_id | user_id | device_info | created_at    | expires_at    | last_active_at | ip_address |
| ---------- | ------- | ----------- | ------------- | ------------- | -------------- | ---------- |
| UUID       | UUID    | User-Agent  | ISO timestamp | ISO timestamp | ISO timestamp  | IP         |

**Important**: Only ONE session per user. Creating a new session deletes all previous sessions.

#### 3. Services Sheet

| service_id | name     | description | redirect_url | free_tier_enabled |
| ---------- | -------- | ----------- | ------------ | ----------------- |
| UUID       | App Name | Description | http://...   | true/false        |

#### 4. Entitlements Sheet

| entitlement_id | user_id | service_id | tier_level | valid_until            |
| -------------- | ------- | ---------- | ---------- | ---------------------- |
| UUID           | UUID    | UUID       | free/pro   | ISO timestamp or empty |

#### 5. OTPs Sheet (Ephemeral)

| email            | otp_code | expires_at    | created_at    |
| ---------------- | -------- | ------------- | ------------- |
| user@example.com | 123456   | ISO timestamp | ISO timestamp |

**Important**: OTP rows are DELETED immediately after verification.

#### 6. AuthCodes Sheet

| code | user_id | service_id | expires_at    | used       |
| ---- | ------- | ---------- | ------------- | ---------- |
| UUID | UUID    | UUID       | ISO timestamp | true/false |

## Authentication Flow

### For End Users

1. User visits a protected application (e.g., `app01`)
2. Application redirects to: `https://sso.example.com/authorize?service_id=SERVICE_ID`
3. SSO checks if user has valid session:
   - **No session**: Redirect to `/login`
   - **Has session**: Continue to step 4
4. SSO checks entitlement:
   - **Has entitlement**: Generate auth code, redirect to app
   - **No entitlement + Free tier enabled**: Create free entitlement, generate code, redirect
   - **No entitlement + No free tier**: Show upgrade page
5. Application receives auth code and exchanges it for user data

### Login Flow (Passwordless)

1. User enters email at `/login`
2. System generates 6-digit OTP
3. OTP saved to Google Sheets with 10-minute expiry
4. OTP sent via email
5. User enters OTP
6. System verifies OTP:
   - **Valid**: Delete OTP row, create/get user, create session (deleting old sessions), set JWT cookie
   - **Invalid/Expired**: Delete OTP row, show error

## API Endpoints

### Authentication APIs

#### POST `/api/auth/login`

Send OTP to email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

#### POST `/api/auth/verify`

Verify OTP and create session.

**Request:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "user_id": "...",
    "email": "user@example.com",
    "role": "user"
  }
}
```

Sets `sso_token` HTTP-only cookie.

#### GET `/api/auth/me`

Get current user info.

**Response:**

```json
{
  "user": {
    "user_id": "...",
    "email": "user@example.com",
    "role": "user",
    "status": "active"
  }
}
```

#### POST `/api/auth/logout`

Logout and delete session.

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST `/api/auth/token`

Exchange authorization code for user data (for client applications).

**Request:**

```json
{
  "code": "auth-code-here"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "user_id": "...",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Authorization Endpoint

#### GET `/authorize?service_id=SERVICE_ID`

OAuth-like authorization endpoint. Handles the entire SSO flow.

**Flow:**

1. Check if service exists
2. Check if user is authenticated
3. Check if user has entitlement
4. Auto-create free tier entitlement if applicable
5. Generate authorization code
6. Redirect to service's redirect_url with code

### Admin APIs

#### GET `/api/admin/services`

Get all services (admin only).

#### POST `/api/admin/services`

Create new service (admin only).

**Request:**

```json
{
  "name": "My Application",
  "description": "Description",
  "redirect_url": "http://localhost:3000/auth/callback",
  "free_tier_enabled": true
}
```

### Initialization

#### GET `/api/init`

Initialize Google Sheets structure. Run this once after setup.

## Client Application Integration

### Step 1: Register Your Service

1. Login as admin
2. Go to Admin Panel
3. Create a new service
4. Copy the `service_id` and authorization URL

### Step 2: Implement Redirect

When user needs authentication, redirect to:

```
https://your-sso-domain.com/authorize?service_id=YOUR_SERVICE_ID
```

### Step 3: Handle Callback

Create a callback route at your registered redirect URL:

```typescript
// app/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code" }, { status: 400 });
  }

  // Exchange code for user data
  const response = await fetch("https://your-sso-domain.com/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();

  if (!data.success) {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }

  // Create your local session with data.user
  // Then redirect to your app
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

## Environment Setup

### Required Environment Variables

```env
# Google Sheets
SPREADSHEET_ID=your_spreadsheet_id
SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
APP_NAME=HawkVision SSO
SESSION_DURATION_DAYS=30
OTP_EXPIRY_MINUTES=10
AUTH_CODE_EXPIRY_SECONDS=60
```

### Google Sheets Setup

1. Create a new Google Sheet
2. Create a Google Cloud Project
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key
6. Share your spreadsheet with the service account email
7. Copy the spreadsheet ID from the URL

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password
3. Use the app password in `SMTP_PASS`

## Installation

```bash
cd sso-v2
npm install
```

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## First-Time Setup

1. Configure `.env.local` with all required variables
2. Run the app: `npm run dev`
3. Visit `http://localhost:3001/api/init` to initialize sheets
4. Login with any email (first user becomes admin if you manually set role in sheet)
5. Go to Admin Panel and create your first service

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules (Premium Design)
- **Database**: Google Sheets via googleapis
- **Auth**: jsonwebtoken + Custom Logic
- **Email**: nodemailer (Gmail SMTP)

## Security Best Practices

1. **Always use HTTPS in production**
2. **Keep JWT_SECRET secure and random**
3. **Use environment variables, never commit secrets**
4. **Regularly audit sessions and entitlements**
5. **Monitor OTP and AuthCode tables for anomalies**
6. **Set up rate limiting for login endpoints**

## Maintenance

### Cleanup Tasks

The system automatically cleans up:

- Expired OTPs (deleted on verification)
- Old sessions (deleted when new session created)
- Expired auth codes (checked on use)

### Manual Cleanup (Optional)

You can periodically run cleanup for expired sessions:

```typescript
// Create a cron job or API endpoint
import { getRows, deleteRow } from "@/lib/sheets";

async function cleanupExpiredSessions() {
  const sessions = await getRows("Sessions");
  const now = new Date();

  for (const session of sessions) {
    if (new Date(session.expires_at) < now) {
      await deleteRowsByColumn("Sessions", "session_id", session.session_id);
    }
  }
}
```

## Support

For issues or questions, refer to the codebase or documentation.

---

Built with ❤️ using Next.js and Google Sheets
