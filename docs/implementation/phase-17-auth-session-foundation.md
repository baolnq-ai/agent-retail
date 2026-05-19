# Phase 17 — Auth and session foundation

Date: 2026-05-15

## Scope

Implemented the first production auth layer for the retail agent app using username/password login and HttpOnly cookie sessions.

## Backend

- Added Prisma models for `User` and `UserSession`.
- Added user ownership foundation to `Cart` with optional `userId`.
- Added schema foundation for `ChatThread`, `ChatMessage`, `UserPreference`, and `UserInteractionEvent` for the next memory/personalization phase.
- Added secure password utilities using Node `crypto.scrypt`.
- Added opaque session tokens with SHA-256 token hashes stored in the database.
- Added `AuthService` and `AuthController` endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- Enabled CORS credentials for the web origin.

## Frontend

- Added login/register account section to the storefront.
- Added logged-in user chip and logout controls.
- Updated API requests to include `credentials: 'include'` so the browser sends the HttpOnly session cookie.
- Kept tokens out of frontend state and browser storage.

## Security

- Passwords are never stored or logged in plaintext.
- Session cookies are HttpOnly, `SameSite=Lax`, `Path=/`, and expire via `Max-Age`.
- Session cookie uses `Secure` in production.
- Only hashed session tokens are stored in the database.
- Login errors are generic for invalid credentials.

## Runtime validation

Passed real runtime checks:

- API typecheck.
- Prisma generate and database push.
- API auth runtime test with real HTTP requests and cookies.
- Full API runtime chain including health, auth, model gateway, catalog/knowledge, commerce, agent chat, stream, and CORS.
- Web typecheck/build through `test:runtime`.
- Web runtime home page test with a real HTTP request.

## Remaining work

- Attach commerce cart resolution to authenticated users.
- Persist chat history, interaction events, and user preferences.
- Feed user memory and preference summaries into the sales-agent pipeline.
