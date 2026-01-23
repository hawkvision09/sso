# HawkVision SSO Integration Documentation

## Overview

This document outlines how to integrate an external application (Service Provider) with the HawkVision Single Sign-On (SSO) system.
The integration follows a lightweight OIDC (OpenID Connect) flow, ensuring users authenticate via the central SSO and access your service securely.

## Integration Flow

1. **User Visits Service**: User attempts to access a protected page on your app.
2. **Redirect to SSO**: Your app detects no session and redirects user to SSO `/authorize`.
3. **SSO Authentication**: SSO validates user session (or prompts login) and entitlement.
4. **Callback with Code**: SSO redirects user back to your app with a temporary `code`.
5. **Exchange Code**: Your app calls SSO API to exchange `code` for User Profile.
6. **Establish Session**: Your app creates its own local session for the user.

---

## 1. Register Your Service

**Prerequisite**: Your service must be registered in the SSO Admin Panel.
You will need:

- **Service ID**: UUID assigned to your service (e.g., `550e8400-e29b...`).
- **Redirect URL**: The exact callback URL in your app (e.g., `https://myapp.com/auth/callback`).

---

## 2. Authentication Protocol

### Step A: Redirect to SSO (The Login Request)

When an unauthenticated user accesses your app, redirect them to the following URL:

`GET https://sso.hawkvision.com/authorize`

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `service_id` | `string` | **Yes** | The UUID of your service. |

**Example:**

```http
https://sso.hawkvision.com/authorize?service_id=1234-5678-90ab-cdef
```

### Step B: Handle the Callback

If authentication is successful, the SSO will redirect the user back to your registered **Redirect URL** with an Authorization Code:

`GET https://myapp.com/auth/callback?code=AUTH_CODE_HERE`

**Security Note**: This code is valid for **60 seconds** and can be used **only once**.

### Step C: Exchange Code for User Profile

Your server must immediately exchange this code for user details via a back-channel API call.

**Endpoint:**
`POST https://sso.hawkvision.com/api/auth/token`

**Headers:**
`Content-Type: application/json`

**Body:**

```json
{
  "code": "AUTH_CODE_HERE"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "user_id": "user-uuid-123",
    "email": "john.doe@example.com",
    "role": "user" // or "admin"
  }
}
```

**Error Response (400/401):**

```json
{
  "error": "Code expired" // or "Invalid Code", "Code already used"
}
```

---

## 3. Recommended Implementation (Node.js / Next.js Example)

### Middleware (Protecting Routes)

Checks for local session. If missing, redirects to SSO.

```javascript
// middleware.ts
export function middleware(request) {
  const session = request.cookies.get("app_session");

  if (!session) {
    const ssoUrl = new URL("https://sso.hawkvision.com/authorize");
    ssoUrl.searchParams.set("service_id", process.env.SSO_SERVICE_ID);
    return NextResponse.redirect(ssoUrl);
  }
}
```

### Callback Handler (The Exchange)

Handles the return trip and creates the local session.

```javascript
// app/auth/callback/route.ts
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.json({ error: "No code provided" });

  // Exchange code for user data
  const response = await fetch("https://sso.hawkvision.com/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();

  if (!data.success) {
    return NextResponse.json({ error: "SSO Login Failed" }, { status: 401 });
  }

  // Create Local Session (Example using cookies)
  const cookieStore = await cookies();
  cookieStore.set("app_session", data.user.email, { httpOnly: true });

  // Redirect to Dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

## 4. Environment Variables

To connect, your application will likely need:

```bash
SSO_URL=https://sso.hawkvision.com
// Your specific ID from the SSO Admin Panel
SSO_SERVICE_ID=your-service-uuid
```
