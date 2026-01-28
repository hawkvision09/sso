# SSO v2 - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Development Setup Complete

- [ ] All dependencies installed (`npm install`)
- [ ] `.env.local` configured with all required variables
- [ ] Google Sheets initialized (`/api/init` returns success)
- [ ] Admin user created and verified
- [ ] At least one test service created
- [ ] Login flow tested successfully
- [ ] Authorization flow tested with test service
- [ ] All pages load without errors

### ✅ Environment Configuration

- [ ] `SPREADSHEET_ID` is correct
- [ ] `SERVICE_ACCOUNT_EMAIL` is correct
- [ ] `SERVICE_ACCOUNT_KEY` is properly formatted (with `\n`)
- [ ] `JWT_SECRET` is strong and random (32+ characters)
- [ ] `SMTP_USER` and `SMTP_PASS` are correct
- [ ] `NEXT_PUBLIC_APP_URL` is set to production domain
- [ ] All optional config values reviewed

### ✅ Google Cloud Setup

- [ ] Google Cloud Project created
- [ ] Google Sheets API enabled
- [ ] Service Account created
- [ ] Service Account key downloaded
- [ ] Spreadsheet shared with service account (Editor access)
- [ ] Spreadsheet has all 6 tabs initialized

### ✅ Email Setup

- [ ] Gmail account configured
- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] Test email sent successfully
- [ ] OTP emails received and formatted correctly

### ✅ Security Review

- [ ] JWT_SECRET is unique and not shared
- [ ] Service account JSON is not committed to git
- [ ] `.env.local` is in `.gitignore`
- [ ] No sensitive data in code
- [ ] HTTPS will be enabled in production
- [ ] Cookies set to `secure: true` in production
- [ ] CORS configured if needed

## Production Deployment

### Choose Your Platform

#### Option 1: Vercel (Recommended)

- [ ] Code pushed to GitHub (without `.env.local`)
- [ ] Vercel project created
- [ ] Environment variables added in Vercel dashboard:
  - [ ] SPREADSHEET_ID
  - [ ] SERVICE_ACCOUNT_EMAIL
  - [ ] SERVICE_ACCOUNT_KEY
  - [ ] JWT_SECRET
  - [ ] SMTP_HOST
  - [ ] SMTP_PORT
  - [ ] SMTP_USER
  - [ ] SMTP_PASS
  - [ ] NEXT_PUBLIC_APP_URL (production URL)
  - [ ] APP_NAME
  - [ ] SESSION_DURATION_DAYS
  - [ ] OTP_EXPIRY_MINUTES
  - [ ] AUTH_CODE_EXPIRY_SECONDS
- [ ] Deployment successful
- [ ] Production URL accessible
- [ ] `/api/init` works in production
- [ ] Login flow works in production

#### Option 2: Other Platforms

**For AWS, Google Cloud, Azure, etc.:**

- [ ] Build completed: `npm run build`
- [ ] Environment variables configured in platform
- [ ] Node.js 18+ runtime selected
- [ ] Start command set: `npm start`
- [ ] Port configured correctly
- [ ] Health check endpoint configured
- [ ] SSL/TLS certificate configured

### Post-Deployment Verification

- [ ] Homepage loads (`/`)
- [ ] Login page loads (`/login`)
- [ ] Can send OTP
- [ ] Can receive OTP email
- [ ] Can verify OTP and login
- [ ] Dashboard loads after login
- [ ] Admin panel accessible (for admin users)
- [ ] Can create new service
- [ ] Authorization flow works
- [ ] Token exchange works
- [ ] Logout works

### DNS & Domain Setup

- [ ] Domain purchased/configured
- [ ] DNS records updated
- [ ] SSL certificate issued
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] `NEXT_PUBLIC_APP_URL` updated to production domain
- [ ] All services updated with new SSO URL

## Client Application Integration

### For Each Client App

- [ ] Service registered in SSO admin panel
- [ ] Service ID copied
- [ ] Redirect URL configured correctly
- [ ] Free tier setting configured
- [ ] Client app updated with SSO URL
- [ ] Client app updated with Service ID
- [ ] Middleware implemented
- [ ] Callback handler implemented
- [ ] Local session management implemented
- [ ] Logout implemented
- [ ] Integration tested end-to-end

## Monitoring & Maintenance

### Setup Monitoring

- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Email delivery monitoring
- [ ] Database (Google Sheets) access monitoring

### Regular Maintenance Tasks

- [ ] Review OTPs sheet (should be mostly empty)
- [ ] Review Sessions sheet (one per active user)
- [ ] Review AuthCodes sheet (expired codes can be cleaned)
- [ ] Monitor failed login attempts
- [ ] Review admin access logs
- [ ] Check for expired entitlements
- [ ] Update dependencies regularly

## Security Hardening

### Production Security

- [ ] Rate limiting implemented for `/api/auth/login`
- [ ] Rate limiting implemented for `/api/auth/verify`
- [ ] CAPTCHA considered for login (optional)
- [ ] IP-based blocking for suspicious activity (optional)
- [ ] Audit logging enabled
- [ ] Security headers configured:
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] Strict-Transport-Security
  - [ ] Content-Security-Policy

### Access Control

- [ ] Admin users documented
- [ ] Service account access restricted
- [ ] Google Sheets access limited to service account
- [ ] Gmail app password secured
- [ ] JWT secret backed up securely
- [ ] Emergency access procedure documented

## Backup & Recovery

### Data Backup

- [ ] Google Sheets version history enabled (automatic)
- [ ] Manual export of sheets scheduled (weekly/monthly)
- [ ] Service account key backed up securely
- [ ] Environment variables documented securely
- [ ] Recovery procedure documented

### Disaster Recovery Plan

- [ ] Backup SSO URL documented
- [ ] Service account key recovery process
- [ ] Gmail account recovery process
- [ ] Client app fallback plan
- [ ] Communication plan for outages

## Performance Optimization

### Production Optimizations

- [ ] Next.js production build optimized
- [ ] Static assets cached
- [ ] API responses cached where appropriate
- [ ] Database queries optimized
- [ ] Email sending optimized (queue if needed)
- [ ] CDN configured for static assets (optional)

### Scaling Considerations

- [ ] Google Sheets API quota monitored
- [ ] Gmail sending limits monitored
- [ ] Concurrent user capacity tested
- [ ] Load testing performed
- [ ] Auto-scaling configured (if applicable)

## Documentation

### Internal Documentation

- [ ] Production environment variables documented
- [ ] Service account details documented
- [ ] Admin user list maintained
- [ ] Registered services list maintained
- [ ] Integration guide shared with developers
- [ ] Troubleshooting guide created
- [ ] Emergency contact list created

### User Documentation

- [ ] Login instructions for end users
- [ ] FAQ created
- [ ] Support contact information provided
- [ ] Privacy policy created (if required)
- [ ] Terms of service created (if required)

## Testing Checklist

### Functional Testing

- [ ] User registration works
- [ ] OTP delivery works
- [ ] OTP verification works
- [ ] Session creation works
- [ ] One session per user enforced
- [ ] OTP deletion verified
- [ ] Authorization flow works
- [ ] Token exchange works
- [ ] Entitlement checking works
- [ ] Free tier auto-grant works
- [ ] Admin panel works
- [ ] Service creation works
- [ ] Logout works

### Security Testing

- [ ] SQL injection tested (N/A - using Sheets)
- [ ] XSS tested
- [ ] CSRF tested
- [ ] Session hijacking tested
- [ ] Code reuse tested (should fail)
- [ ] Expired code tested (should fail)
- [ ] Invalid OTP tested (should fail)
- [ ] Expired OTP tested (should fail)

### Performance Testing

- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Email delivery time acceptable
- [ ] Concurrent users tested
- [ ] Database query performance acceptable

### Browser Testing

- [ ] Chrome/Edge tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Mobile browsers tested
- [ ] Responsive design verified

## Launch Checklist

### Pre-Launch

- [ ] All above checklists completed
- [ ] Stakeholders notified
- [ ] Launch date scheduled
- [ ] Rollback plan prepared
- [ ] Support team briefed

### Launch Day

- [ ] Deploy to production
- [ ] Verify all endpoints
- [ ] Test complete flow
- [ ] Monitor logs for errors
- [ ] Monitor email delivery
- [ ] Monitor user signups
- [ ] Be available for support

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Review error logs
- [ ] Review user feedback
- [ ] Address any issues
- [ ] Document lessons learned
- [ ] Plan next iteration

## Maintenance Schedule

### Daily

- [ ] Check error logs
- [ ] Monitor email delivery
- [ ] Check for failed logins

### Weekly

- [ ] Review OTPs sheet (cleanup if needed)
- [ ] Review Sessions sheet
- [ ] Review new service registrations
- [ ] Check system performance

### Monthly

- [ ] Export Google Sheets backup
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Review and update documentation
- [ ] Performance optimization review

### Quarterly

- [ ] Security audit
- [ ] Penetration testing (optional)
- [ ] Disaster recovery drill
- [ ] User satisfaction survey
- [ ] Feature planning

## Emergency Procedures

### SSO Down

1. Check Vercel/hosting status
2. Check Google Sheets API status
3. Check Gmail SMTP status
4. Review error logs
5. Notify users if extended outage
6. Implement fallback if available

### Email Not Sending

1. Verify Gmail credentials
2. Check Gmail sending limits
3. Check SMTP settings
4. Test with different email
5. Consider backup email provider

### Database Issues

1. Check Google Sheets access
2. Verify service account permissions
3. Check API quota
4. Review recent changes
5. Restore from backup if needed

## Support Contacts

### Internal

- **Developer**: [Your contact]
- **Admin**: [Admin contact]
- **DevOps**: [DevOps contact]

### External

- **Vercel Support**: [If using Vercel]
- **Google Cloud Support**: [If needed]
- **Domain Registrar**: [Your registrar]

---

## Final Sign-Off

- [ ] All checklists completed
- [ ] All stakeholders approved
- [ ] Documentation complete
- [ ] Support team ready
- [ ] Monitoring in place
- [ ] Backup procedures tested

**Deployed by**: ******\_\_\_******
**Date**: ******\_\_\_******
**Production URL**: ******\_\_\_******

---

**🚀 Ready to launch!**

Remember: This is a living document. Update it as your deployment evolves.
