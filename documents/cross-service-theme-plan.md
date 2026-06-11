# Cross-Service Theme From SSO

## Summary
Use `sso` as the system of record for each user's theme preference, stored in the SSO user profile in the database. Do not propagate theme through the auth token. Instead, when a user logs in or changes theme, `sso` should update a separate shared theme cookie on the parent domain, and each sibling service should read that cookie in its own root layout and apply the same CSS variable theme locally.

## Key Changes
- Keep the canonical theme definitions in one shared module derived from the current `sso/lib/theme.ts` shape:
  - `ThemeName`
  - `themeCookieName`
  - `resolveActiveThemeName`
  - `getThemeStyle`
  - shared token map for `light | dark | blue`
- Recommended code organization:
  - Keep persistence and theme update APIs inside `sso`
  - Move only the reusable theme helpers into a workspace package under `packages/` so `cost-mgmt`, `coupons`, and `catering-app` can import the same theme names and CSS-variable builder
  - Do not make the `sso` app itself a dependency of the other apps
- In `sso`, add user-level persistence:
  - add a `theme` field on the user profile/settings record
  - on successful login, load the saved theme and set the shared theme cookie
  - on theme change, update both DB and cookie
- In each service:
  - read the shared theme cookie in the root layout
  - resolve the active theme using the shared helper
  - apply `style={getThemeStyle(activeTheme)}` and `data-theme={activeTheme.name}` the same way `sso` already does
  - continue using CSS variables like `--theme-surface`, `--theme-text`, `--theme-accent`
- Cookie strategy:
  - separate cookie from auth/session token
  - set cookie on the parent domain so sibling subdomains can read it
  - keep it lightweight: only the theme name, not full token JSON

## Public Interfaces
- Shared package exports:
  - `ThemeName`
  - `themeCookieName`
  - `themes`
  - `resolveActiveThemeName`
  - `getThemeStyle`
- SSO API or action for theme update:
  - input: selected `ThemeName`
  - behavior: validate theme, persist to user profile, refresh shared cookie
  - output: success plus resolved active theme
- User model addition:
  - `theme: ThemeName | null` with fallback to app default when unset

## Test Plan
- User selects a theme in `sso`, refreshes, and sees the same theme.
- User logs out and logs back in on the same browser, and the saved DB theme is restored.
- User signs in on a new browser/device and receives the saved theme from SSO.
- Visiting `cost-mgmt` or another sibling app after login applies the same theme from the shared cookie.
- Invalid or missing cookie falls back to the configured default theme without breaking rendering.
- Changing theme does not invalidate auth or force logout.

## Assumptions
- Services are under the same parent domain, so a cross-subdomain cookie is possible.
- Theme should persist per user across sessions and devices.
- Auth token refresh on every theme change is not acceptable, so theme propagation should stay outside the auth token.
- A new published npm package is not required; a local workspace package is the cleanest reuse mechanism. If you want the fastest path, you can copy the helper into each app first, but that is a temporary solution.
