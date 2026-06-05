# SSO Migration — Mongo + Redis (summary)

Goal: migrate SSO core auth from Google Sheets to MongoDB (durable) and Upstash Redis (ephemeral OTP / auth-codes). Use environment-prefixed DB names to separate `dev` and `prd` data.

DB naming convention
- Final DB name = `${env}-${baseName}` where `env` is `dev` or `prd` (from `APP_ENV`).
- Examples: `dev-core-auth`, `prd-core-auth`, `dev-sso`, `prd-sso`.

High-level steps
1. Prepare MongoDB cluster (create user, whitelist IPs, enable TLS). Ensure `MONGODB_URI` is available.
2. Configure apps: set `AUTH_CORE_BACKEND=mongo`, `AUTH_OTP_BACKEND=redis`, `AUTH_CODE_BACKEND=redis`, and `APP_ENV` appropriately in environment.
3. Backfill data from Sheets → Mongo:
   - Export Sheets to CSV/JSON.
   - Insert into Mongo collections: `users`, `sessions`, `otps` (optional), `auth_codes` (optional).
   - Create indexes: `users.email` (unique), `sessions.expiresAt`, `auth_codes.code` (ttl via expireAt), OTP keys in Redis.
4. Smoke tests (against `dev-*` DBs): log in, create session, OTP flows, provider OAuth flows.
5. Switch reads to Mongo in SSO and apps (set envs + redeploy) and monitor.
6. Cutover: set production `APP_ENV=prd` and update `AUTH_CORE_BACKEND` to `mongo` for production apps.

Backfill notes
- Include `id` mapping preservation so existing sessions/users keep the same IDs where possible.
- Sanitize and validate emails/user metadata.

Rollback plan
- Keep Sheets writable until verification completes. If problems found, set `AUTH_CORE_BACKEND=sheets` and revert deployments.

Verification checklist
- Verify login and session cookie creation.
- Verify JWT validation in each app's proxy/middleware.
- Verify OTP/Auth-code flows via Upstash Redis if enabled.
- Monitor error rates and auth latency during and after cutover.

Run command
- Dry run: `npm run migrate:data`
- Execute: `npm run migrate:data -- --execute`

Status
- Dev backfill completed successfully into `dev-core-auth` and `dev-sso` using the shared MongoDB URI.
- Production can be migrated later by rerunning the same command with `APP_ENV=prd`.
