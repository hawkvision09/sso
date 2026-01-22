# SSO System Design Document

## Architecture Overview

This SSO system uses a **Central Identity Provider (IdP)** architecture. The Next.js application serves as the IdP.
It handles user authentication and issuance of session tokens. Service entitlements are decoupled from authentication.

## Core Concepts

1. **User Identity**: Defined by email address. Passwordless (OTP-based).
2. **Session**: A global, long-lived session (30 days) represented by a JWT stored in an HTTP-only cookie.
3. **Entitlements**: Access rights to specific services (e.g., "Service A - Free Tier", "Service B - Pro").
4. **Data Store**: Google Sheets acts as the database.

## Data Model (Google Sheets)

### 1. Users

| user_id (UUID) | email | role (admin/user) | created_at | status (active/suspended) |
| -------------- | ----- | ----------------- | ---------- | ------------------------- |

### 2. Sessions

| session_id (UUID) | user_id | device_info | created_at | expires_at | last_active_at | ip_address |
| ----------------- | ------- | ----------- | ---------- | ---------- | -------------- | ---------- |

### 3. Services

| service_id (UUID) | name | description | redirect_url | free_tier_enabled (bool) |
| ----------------- | ---- | ----------- | ------------ | ------------------------ |

### 4. Entitlements

| entitlement_id (UUID) | user_id | service_id | tier_level (free/pro) | valid_until |
| --------------------- | ------- | ---------- | --------------------- | ----------- |

_Note: Entitlements are auto-created on first access if free tier is available._

### 5. OTPs (Ephemeral / Optional if using cache, but Sheets for persistence)

| email | otp_code | expires_at | created_at |
| ----- | -------- | ---------- | ---------- |

## Authentication Flow (Login)

1. User enters Email.
2. System generates 6-digit OTP, saves to `OTPs` sheet (or memory), and emails it via Gmail SMTP.
3. User enters OTP.
4. System verifies OTP.
5. If user doesn't exist -> **Sign Up** (Create row in `Users`).
6. System generates `session_id`, saves to `Sessions` sheet.
7. System signs a JWT containing `{ session_id, user_id, email, role }`.
8. JWT is set as `HttpOnly` cookie.

## Authorization Flow (Service Access)

1. User requests access to a Service (e.g., via a Dashboard link).
2. Middleware checks for valid JWT.
3. If no JWT -> Redirect to Login.
4. If JWT valid ->
   a. Check `Entitlements` sheet for `{ user_id, service_id }`.
   b. If entitlement exists -> Grant access (Redirect to service with token or internal routing).
   c. If no entitlement ->
   i. Check `Services` sheet for `free_tier_enabled`.
   ii. If yes -> Create "Free" entitlement in `Entitlements`. Grant access.
   iii. If no -> Show "Upgrade Required" page.

## Admin Features

- View/Manage Users.
- View/Manage Services.
- Revoke Sessions (Security).

## Tech Stack

- **Framework**: Next.js (App Router).
- **Language**: TypeScript.
- **Styling**: CSS Modules (Rich Aesthetics).
- **Database**: Google Sheets via `googleapis`.
- **Auth**: `jsonwebtoken` + Custom Logic.
- **Email**: `nodemailer`.

## Directory Structure

- `/app`: Pages and API routes.
- `/lib`: Helper functions (sheets.ts, auth.ts, email.ts).
- `/components`: UI Components.
- `/styles`: Global and module CSS.
