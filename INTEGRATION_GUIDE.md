# Client Application Integration Guide

This guide shows you how to integrate your application with HawkVision SSO.

## Quick Start

### 1. Register Your Application

Contact your SSO administrator to register your application. You'll need to provide:

- **Application Name**: e.g., "My App"
- **Description**: Brief description of your app
- **Redirect URL**: The callback URL in your app (e.g., `http://localhost:3000/auth/callback`)
- **Free Tier**: Whether to auto-grant access to all users

You'll receive:

- **Service ID**: A UUID identifying your application
- **Authorization URL**: The URL to redirect users for authentication

### 2. Environment Variables

Add these to your `.env.local`:

```env
SSO_URL=http://localhost:3001
SSO_SERVICE_ID=your-service-id-here
```

### 3. Implement Middleware (Next.js Example)

Create `middleware.ts` in your project root:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if user has a session
  const session = request.cookies.get("app_session");

  if (!session) {
    // Redirect to SSO for authentication
    const ssoUrl = new URL(`${process.env.SSO_URL}/authorize`);
    ssoUrl.searchParams.set("service_id", process.env.SSO_SERVICE_ID!);

    return NextResponse.redirect(ssoUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    // Add your protected routes here
  ],
};
```

### 4. Create Callback Handler

Create `app/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No authorization code provided" },
      { status: 400 },
    );
  }

  try {
    // Exchange code for user data
    const response = await fetch(`${process.env.SSO_URL}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    // Create local session
    const cookieStore = await cookies();
    cookieStore.set("app_session", JSON.stringify(data.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Redirect to your app's dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("SSO callback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 5. Get Current User (Optional Helper)

Create `lib/auth.ts`:

```typescript
import { cookies } from "next/headers";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("app_session");

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}
```

Use in your pages:

```typescript
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
    </div>
  );
}
```

### 6. Logout Implementation

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("app_session");

  return NextResponse.json({ success: true });
}
```

Use in your UI:

```typescript
const handleLogout = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
};
```

## Complete Flow Diagram

```
User visits protected page
         ↓
Middleware checks session
         ↓
   No session found
         ↓
Redirect to SSO: /authorize?service_id=XXX
         ↓
SSO checks authentication
         ↓
   Not authenticated
         ↓
SSO shows login page
         ↓
User enters email → Receives OTP → Enters OTP
         ↓
SSO creates session
         ↓
SSO checks entitlement
         ↓
Has entitlement OR free tier enabled
         ↓
SSO generates auth code
         ↓
Redirect to: your-app.com/auth/callback?code=XXX
         ↓
Your app exchanges code for user data
         ↓
Your app creates local session
         ↓
Redirect to dashboard
         ↓
User is authenticated! 🎉
```

## API Reference

### Authorization Endpoint

**URL**: `GET {SSO_URL}/authorize?service_id={SERVICE_ID}`

**Description**: Initiates the SSO flow. Redirects to login if needed, then back to your app with an authorization code.

**Parameters**:

- `service_id` (required): Your application's service ID

**Response**: Redirects to your registered callback URL with `?code=AUTHORIZATION_CODE`

### Token Exchange Endpoint

**URL**: `POST {SSO_URL}/api/auth/token`

**Description**: Exchange authorization code for user data.

**Request Body**:

```json
{
  "code": "authorization-code-here"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Error Response** (401):

```json
{
  "error": "Invalid, expired, or already used authorization code"
}
```

**Important**: Authorization codes:

- Expire in 60 seconds
- Can only be used once
- Are automatically marked as used after exchange

## Security Considerations

### 1. Validate the Code Immediately

Always exchange the authorization code as soon as you receive it. Don't store it or delay the exchange.

### 2. Use HTTP-Only Cookies

Store your local session in HTTP-only cookies to prevent XSS attacks:

```typescript
cookieStore.set("app_session", sessionData, {
  httpOnly: true, // ← Important!
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});
```

### 3. Verify the Redirect URL

Ensure the callback URL matches exactly what you registered with the SSO.

### 4. Handle Errors Gracefully

```typescript
try {
  const response = await fetch(`${process.env.SSO_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    // Log the error
    console.error("SSO token exchange failed:", await response.text());
    // Redirect to error page
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const data = await response.json();
  // ... handle success
} catch (error) {
  console.error("SSO error:", error);
  return NextResponse.redirect(new URL("/auth/error", request.url));
}
```

### 5. Implement Session Refresh

Consider implementing a session refresh mechanism:

```typescript
// Check if session is still valid
export async function validateSession(userId: string) {
  // Optional: Call SSO to verify user still has access
  const response = await fetch(`${process.env.SSO_URL}/api/auth/me`, {
    headers: {
      // Include SSO session if you store it
    },
  });

  return response.ok;
}
```

## Testing Your Integration

### 1. Test Authentication Flow

1. Clear all cookies
2. Visit a protected route
3. Verify redirect to SSO
4. Complete login
5. Verify redirect back to your app
6. Check that session is created

### 2. Test Authorization Code

```bash
# This should fail (code already used)
curl -X POST http://localhost:3001/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"code":"same-code-again"}'
```

### 3. Test Session Persistence

1. Login
2. Close browser
3. Reopen and visit protected route
4. Should still be logged in (if within 30 days)

## Common Issues

### Issue: Infinite Redirect Loop

**Cause**: Middleware redirecting to SSO, but SSO redirecting back without creating session.

**Solution**: Check that:

1. Service ID is correct
2. Redirect URL matches exactly
3. Callback handler is working
4. Session cookie is being set

### Issue: "Invalid authorization code"

**Cause**: Code expired or already used.

**Solution**:

1. Ensure you exchange code immediately
2. Don't refresh the callback page (code can only be used once)
3. Check server time is synchronized

### Issue: Session not persisting

**Cause**: Cookie not being set correctly.

**Solution**:

1. Check cookie settings (httpOnly, secure, sameSite)
2. Verify domain matches
3. Check browser console for cookie errors

## Advanced: Custom User Data

If you need to store additional user data:

```typescript
// After receiving user from SSO
const userData = {
  ...data.user,
  // Add your custom fields
  preferences: {},
  lastLogin: new Date().toISOString(),
};

// Store in your own database
await db.users.upsert({
  where: { email: userData.email },
  update: { lastLogin: userData.lastLogin },
  create: userData,
});

// Then create session
cookieStore.set("app_session", JSON.stringify(userData), {
  httpOnly: true,
  // ...
});
```

## Support

For issues with SSO integration:

1. Check the SSO system logs
2. Verify your service is registered correctly
3. Test the authorization URL manually
4. Contact your SSO administrator

---

Happy integrating! 🚀
