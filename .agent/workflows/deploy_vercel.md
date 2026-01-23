---
description: Deploy SSO Application to Vercel
---

1. Run `npm install -g vercel` (if not installed)
2. Run `vercel login`
3. Run `vercel link` to link to your project
4. Run `vercel deploy --prod`

Additional info:

- Make sure to add the Environment Variables in the Vercel Dashboard (Project Settings -> Environment Variables).
- Or you can pull them from .env.local if you use `vercel env pull`.
