# SSO v2 - Quick Reference

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure .env.local
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 3. Run development server
npm run dev

# 4. Initialize database
# Visit: http://localhost:3001/api/init

# 5. Login and create admin user
# Visit: http://localhost:3001/login
# Then manually change role to 'admin' in Google Sheets
```

## 📋 Environment Variables Checklist

```env
✓ SPREADSHEET_ID
✓ SERVICE_ACCOUNT_EMAIL
✓ SERVICE_ACCOUNT_KEY
✓ JWT_SECRET
✓ RESEND_API_KEY
✓ RESEND_FROM_EMAIL
✓ NEXT_PUBLIC_APP_URL
```

## 🔗 Key URLs

| URL                         | Purpose                        |
| --------------------------- | ------------------------------ |
| `/`                         | Landing page                   |
| `/login`                    | User login                     |
| `/dashboard`                | User dashboard                 |
| `/admin`                    | Admin panel (admin only)       |
| `/authorize?service_id=XXX` | OAuth authorization endpoint   |
| `/api/init`                 | Initialize database (run once) |
| `/api/auth/login`           | Send OTP                       |
| `/api/auth/verify`          | Verify OTP                     |
| `/api/auth/token`           | Exchange auth code             |
| `/api/auth/me`              | Get current user               |
| `/api/auth/logout`          | Logout                         |
| `/api/admin/services`       | Manage services (admin)        |

## 🔐 Authentication Flow

```
1. Client redirects to: /authorize?service_id=XXX
2. SSO checks session → redirects to /login if needed
3. User enters email → receives OTP → enters OTP
4. SSO creates session, checks entitlement
5. SSO generates auth code
6. Redirects to: client-app.com/auth/callback?code=XXX
7. Client exchanges code for user data
8. Client creates local session
```

## 📊 Google Sheets Structure

```
Users
├── user_id (UUID)
├── email
├── role (admin/user)
├── created_at
└── status (active/suspended)

Sessions (ONE per user)
├── session_id (UUID)
├── user_id
├── device_info
├── created_at
├── expires_at
├── last_active_at
└── ip_address

Services
├── service_id (UUID)
├── name
├── description
├── redirect_url
└── free_tier_enabled (true/false)

Entitlements
├── entitlement_id (UUID)
├── user_id
├── service_id
├── tier_level (free/pro)
└── valid_until

OTPs (Auto-deleted after use)
├── email
├── otp_code
├── expires_at
└── created_at

AuthCodes (60s expiry, single-use)
├── code (UUID)
├── user_id
├── service_id
├── expires_at
└── used (true/false)
```

## 🛠️ Common Tasks

### Create Admin User

```
1. Login with any email
2. Go to Google Sheets → Users tab
3. Change role from 'user' to 'admin'
4. Refresh dashboard
```

### Register New Service

```
1. Login as admin
2. Go to /admin
3. Click "+ Add New Service"
4. Fill form and submit
5. Copy service_id and authorization URL
```

### Integrate Client App

```typescript
// 1. Redirect to SSO
window.location.href = `${SSO_URL}/authorize?service_id=${SERVICE_ID}`;

// 2. Handle callback
const code = searchParams.get("code");
const response = await fetch(`${SSO_URL}/api/auth/token`, {
  method: "POST",
  body: JSON.stringify({ code }),
});
const { user } = await response.json();

// 3. Create local session
cookies.set("app_session", JSON.stringify(user));
```

## 🔍 Debugging

### Check Logs

```bash
# Terminal shows all API requests and errors
# Look for console.error messages
```

### Verify Environment

```typescript
// Visit /api/init
// Should return: {"success":true}
```

### Test Email

```bash
# Send test OTP
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

### Check Session

```bash
# Get current user
curl http://localhost:3001/api/auth/me \
  -H "Cookie: sso_token=YOUR_TOKEN"
```

## ⚠️ Common Issues

| Issue                 | Solution                                             |
| --------------------- | ---------------------------------------------------- |
| "Missing credentials" | Check .env.local has all variables                   |
| "Failed to send OTP"  | Verify Gmail app password is correct                 |
| "Invalid token"       | JWT_SECRET must be same across restarts              |
| "Sheet not found"     | Run /api/init to create sheets                       |
| "Code expired"        | Auth codes expire in 60s, exchange immediately       |
| "Session not found"   | User may have logged in again (one session per user) |

## 🎯 Key Features

✅ **One Session Per User** - Old sessions auto-deleted
✅ **Immediate OTP Cleanup** - Deleted after verification
✅ **OAuth-like Flow** - Industry standard
✅ **Free Tier Support** - Auto-grant access
✅ **Admin Dashboard** - Service management
✅ **Premium UI** - Glassmorphism design

## 📚 Documentation

- `README.md` - Complete overview
- `SETUP_GUIDE.md` - Step-by-step setup
- `INTEGRATION_GUIDE.md` - Client integration
- `IMPROVEMENTS.md` - What's new in v2

## 🚨 Security Checklist

- [ ] JWT_SECRET is random and secure
- [ ] .env.local is in .gitignore
- [ ] Service account JSON is not committed
- [ ] HTTPS enabled in production
- [ ] SMTP credentials are app passwords
- [ ] Spreadsheet shared with service account only

## 📞 Quick Commands

```bash
# Install
npm install

# Dev
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

## 🎨 File Structure

```
sso-v2/
├── app/
│   ├── api/
│   │   ├── auth/          # Auth endpoints
│   │   ├── admin/         # Admin endpoints
│   │   └── init/          # DB initialization
│   ├── login/             # Login page
│   ├── dashboard/         # User dashboard
│   ├── admin/             # Admin panel
│   ├── authorize/         # OAuth endpoint
│   └── page.tsx           # Landing page
├── lib/
│   ├── config.ts          # Environment config
│   ├── sheets.ts          # Google Sheets ops
│   ├── auth.ts            # Auth logic
│   ├── otp.ts             # OTP management
│   └── services.ts        # Service management
└── .env.local             # Configuration
```

## 💡 Pro Tips

1. **Use the admin panel** to copy integration URLs
2. **Check Google Sheets** for real-time data
3. **Monitor OTPs sheet** - should be empty most of the time
4. **Sessions sheet** - one row per active user
5. **Test with incognito** to simulate new users
6. **Use different emails** for testing different users

---

**Need help?** Check the full documentation in README.md and SETUP_GUIDE.md
