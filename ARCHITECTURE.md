# SSO v2 - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SSO v2 System                            │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │   Database   │      │
│  │              │    │              │    │              │      │
│  │  - Landing   │◄──►│  - Auth API  │◄──►│ Google       │      │
│  │  - Login     │    │  - Admin API │    │ Sheets       │      │
│  │  - Dashboard │    │  - Services  │    │              │      │
│  │  - Admin     │    │  - OTP       │    │ 6 Tabs:      │      │
│  │              │    │              │    │ - Users      │      │
│  └──────────────┘    └──────────────┘    │ - Sessions   │      │
│                                           │ - Services   │      │
│                                           │ - Entitle... │      │
│                                           │ - OTPs       │      │
│                                           │ - AuthCodes  │      │
│                                           └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OAuth-like Flow
                              ▼
                    ┌──────────────────┐
                    │  Client Apps     │
                    │  (app01, app02)  │
                    └──────────────────┘
```

## Complete Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Visits protected page
     ▼
┌─────────────────┐
│  Client App     │
│  (e.g., app01)  │
└────┬────────────┘
     │
     │ 2. No session found
     │ 3. Redirect to SSO
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SSO System                                │
│                                                               │
│  GET /authorize?service_id=XXX                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Check if service exists                           │   │
│  │ 2. Check if user authenticated                       │   │
│  │    ├─ No → Redirect to /login                        │   │
│  │    └─ Yes → Continue                                 │   │
│  │ 3. Check entitlement                                 │   │
│  │    ├─ Has entitlement → Generate code                │   │
│  │    ├─ No entitlement + Free tier → Create + Generate │   │
│  │    └─ No entitlement + No free → Show upgrade        │   │
│  │ 4. Generate authorization code (60s expiry)          │   │
│  │ 5. Redirect to client callback with code             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 4. Redirect with code
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Client App Callback                                         │
│  GET /auth/callback?code=XXX                                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Extract code from URL                             │   │
│  │ 2. POST to SSO /api/auth/token                       │   │
│  │    Body: { "code": "XXX" }                           │   │
│  │ 3. Receive user data                                 │   │
│  │    { "user": { "user_id", "email", "role" } }        │   │
│  │ 4. Create local session                              │   │
│  │ 5. Redirect to app dashboard                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 5. User authenticated!
     ▼
┌─────────────────┐
│  App Dashboard  │
│  (Protected)    │
└─────────────────┘
```

## Login Flow (Passwordless OTP)

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Opens /login
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Login Page - Step 1: Email                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Enter Email: [________________]                      │   │
│  │             [Send Login Code]                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 2. Submit email
     ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/auth/login                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Generate 6-digit OTP                              │   │
│  │ 2. Delete any existing OTPs for this email           │   │
│  │ 3. Save OTP to Google Sheets (10min expiry)          │   │
│  │ 4. Send OTP via Gmail SMTP                           │   │
│  │ 5. Return success                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 3. OTP sent to email
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Login Page - Step 2: OTP                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Enter Code: [1][2][3][4][5][6]                       │   │
│  │            [Verify & Login]                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 4. Submit OTP
     ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/auth/verify                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Find OTP in Google Sheets                         │   │
│  │ 2. Verify OTP matches                                │   │
│  │ 3. Check not expired                                 │   │
│  │ 4. ✅ DELETE OTP ROW (Requirement #4)                │   │
│  │ 5. Get or create user                                │   │
│  │ 6. ✅ DELETE old sessions for user (Requirement #5)  │   │
│  │ 7. Create new session                                │   │
│  │ 8. Generate JWT token                                │   │
│  │ 9. Set HTTP-only cookie                              │   │
│  │ 10. Return user data                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ 5. Logged in!
     ▼
┌─────────────────┐
│  Dashboard      │
└─────────────────┘
```

## Session Management (One Session Per User)

```
User A logs in from Device 1
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sessions Sheet                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ session_id_1 | user_a | Device 1 | ...               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

User A logs in from Device 2
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  createSession() function                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Delete all sessions where user_id = user_a        │   │
│  │ 2. Create new session for Device 2                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sessions Sheet (After)                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ session_id_2 | user_a | Device 2 | ...               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ✅ Only ONE session per user!                               │
└─────────────────────────────────────────────────────────────┘
```

## OTP Lifecycle (Immediate Deletion)

```
┌─────────────────────────────────────────────────────────────┐
│  OTP Creation                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /api/auth/login                                 │   │
│  │ 1. Generate OTP: 123456                              │   │
│  │ 2. Delete existing OTPs for email                    │   │
│  │ 3. Insert new OTP row                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  OTPs Sheet                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ email | otp_code | expires_at | created_at           │   │
│  │ user@ | 123456   | 10min      | now                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ User enters OTP (correct or incorrect)
     ▼
┌─────────────────────────────────────────────────────────────┐
│  OTP Verification                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /api/auth/verify                                │   │
│  │ 1. Find OTP row                                      │   │
│  │ 2. Check if valid                                    │   │
│  │ 3. ✅ DELETE OTP ROW IMMEDIATELY                     │   │
│  │ 4. Return success/failure                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  OTPs Sheet (After)                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ (empty - OTP deleted)                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ✅ No stale OTP data!                                       │
└─────────────────────────────────────────────────────────────┘
```

## Authorization Code Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Code Generation                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GET /authorize?service_id=XXX                        │   │
│  │ 1. User authenticated ✓                              │   │
│  │ 2. User has entitlement ✓                            │   │
│  │ 3. Generate UUID code                                │   │
│  │ 4. Save to AuthCodes sheet (60s expiry)              │   │
│  │ 5. Redirect to client with code                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  AuthCodes Sheet                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ code | user_id | service_id | expires_at | used      │   │
│  │ abc  | user_a  | service_1  | +60s       | false     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     │ Client exchanges code (within 60s)
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Code Exchange                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /api/auth/token                                 │   │
│  │ 1. Find code in AuthCodes sheet                      │   │
│  │ 2. Check not expired                                 │   │
│  │ 3. Check not already used                            │   │
│  │ 4. Mark as used (update row)                         │   │
│  │ 5. Return user data                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  AuthCodes Sheet (After)                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ code | user_id | service_id | expires_at | used      │   │
│  │ abc  | user_a  | service_1  | +60s       | ✅ true   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ✅ Code can't be reused!                                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ Email
     ▼
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│  SSO Frontend   │◄────►│  SSO Backend │◄────►│ Google       │
│                 │      │              │      │ Sheets       │
│  - Login UI     │      │  - Auth API  │      │              │
│  - Dashboard    │      │  - OTP Logic │      │  Users       │
│  - Admin Panel  │      │  - Sessions  │      │  Sessions    │
└─────────────────┘      │  - Services  │      │  Services    │
                         └──────┬───────┘      │  Entitle...  │
                                │              │  OTPs        │
                                │              │  AuthCodes   │
                                ▼              └──────────────┘
                         ┌──────────────┐
                         │  Gmail SMTP  │
                         │              │
                         │  Send OTP    │
                         └──────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│  lib/config.ts                                               │
│  - Environment variables                                     │
│  - Configuration validation                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  lib/sheets.ts                                               │
│  - Google Sheets connection                                  │
│  - CRUD operations (including DELETE)                        │
│  - Row management                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Business Logic Layer                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  lib/auth.ts │  │  lib/otp.ts  │  │lib/services  │      │
│  │              │  │              │  │              │      │
│  │  - Users     │  │  - Generate  │  │  - Services  │      │
│  │  - Sessions  │  │  - Send      │  │  - Entitle.. │      │
│  │  - JWT       │  │  - Verify    │  │  - AuthCodes │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes (app/api/)                                       │
│  - /auth/login, /auth/verify, /auth/me, /auth/logout        │
│  - /auth/token, /admin/services, /init                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Pages (app/)                                       │
│  - Landing, Login, Dashboard, Admin, Authorize              │
└─────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Transport Security                                 │
│  - HTTPS in production                                       │
│  - Secure cookies                                            │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Authentication                                     │
│  - Email-based OTP (6-digit)                                 │
│  - OTP expires in 10 minutes                                 │
│  - OTP deleted after use                                     │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Session Management                                 │
│  - JWT tokens (signed with secret)                           │
│  - HTTP-only cookies                                         │
│  - One session per user                                      │
│  - Session expiration (30 days)                              │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Authorization                                      │
│  - Service entitlements                                      │
│  - Role-based access (admin/user)                            │
│  - Free tier auto-grant                                      │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: OAuth Flow                                         │
│  - Authorization codes (60s expiry)                          │
│  - Single-use codes                                          │
│  - Code marked as used after exchange                        │
└─────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate the complete architecture and flow of the SSO v2 system, showing how all components work together to provide secure, seamless authentication.
