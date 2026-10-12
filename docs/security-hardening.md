# Security changes on the existing feature branch

## What changed

| Gap | Implementation and verification |
| --- | --- |
| 1, 14 | JWT failures, missing users and invalid sessions return JSON 401 from the filter. Regression tests exercise malformed, tampered, expired and deleted-user tokens, plus budget ownership. |
| 2 | Base Compose publishes only Nginx. PostgreSQL, Redis, ML and backend share an internal Docker network. The explicit development override binds service ports to loopback. Compose configurations are checked separately. |
| 3 | DB username/password, Redis password and JWT secret must be provided. No password fallback or malformed JWT placeholder remains. Existing database credentials are not automatically rotated. |
| 4 | Redis Lua increments are atomic with 60-second expiry. Login and registration allow 10 attempts per normalized account and 100 per backend peer per minute. Redis failure returns 503, never bypasses protection. Nginx adds an IP limit of 10 auth requests/minute with a 5-request burst for login/register/refresh. Actual Redis and outage tests run. |
| 5 | TLS Compose overlay, HTTPS Nginx listener, HTTP redirect and HSTS. Actual TLS response tested using a temporary trusted localhost certificate. A real production certificate/domain must be supplied; no AWS resources are deployed. |
| 6 | Access tokens last 15 minutes and stay in memory. Refresh tokens are 256-bit opaque values, hashed in PostgreSQL, in HttpOnly/Secure/SameSite=Strict cookies. Rotation, reuse detection, expiration, logout and password-change revocation are tested. |
| 7 | Application logs use user/record IDs, not emails, amounts, categories, tokens or passwords. SQL logging is off. Captured-output test checks auth privacy. |
| 8 | Consistent timestamp/status/error/message/path JSON, generic 500 text, validated 400s and duplicate 409s. Filter failures use the same structure. |
| 9 | Login requires validated email and nonblank bounded password. Authentication errors are deliberately generic. |
| 10 | New passwords require 15 characters, at most 72 UTF-8 bytes for BCrypt, and a small local common-password denylist. Legacy passwords still work if within the byte limit. This is a baseline denylist, not a comprehensive breached-password corpus. |
| 11 | Exact CORS origins are configured with CORS_ORIGINS. Cookie auth endpoints require a trusted Origin and X-Requested-With: FinanceTracker, preventing cross-site form/login/logout/refresh requests. |
| 12 | Nginx adds CSP, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy; HTTPS also adds HSTS. CSP disallows inline scripts; inline styles remain necessary for the existing React styles. |
| 13 | Transaction/budget lookup includes the authenticated owner; absent and foreign IDs produce the same 404. Existing foreign records are verified unchanged. |
| 15 | Security contract runs on PostgreSQL 15 Testcontainers, alongside H2. PostgreSQL migrations also get a separate repeatability/preservation test. This checkout has no financial-account entity; no unrelated account model is introduced. Budget month/year are quoted without renaming existing PostgreSQL columns. |
| 16 | Dependabot for Maven/npm/Python/Docker/actions; branch CI runs npm audit, tests/build, Gitleaks and OWASP Dependency-Check. JJWT moved to 0.12.6. Frontend dependency updates resolved the observed npm advisories. Java vulnerability assessment requires the configured NVD scan. |
| 17 | Auth success/failure, registration, invalid access, refresh rotation/reuse/failure, rate limiting, logout and password changes emit structured audit events. A dedicated rotating audit file is retained on the audit_data volume (90 days, capped at 1 GB). Failed unknown users have user_id=unknown. No sensitive request data is recorded. |
| 18 | JWT secret is validated once at startup as even-length hexadecimal of at least 256 bits. Invalid secrets and excessive token lifetimes fail startup. |

## Run and test locally

Use the same feature branch. Do not reset or delete the existing `postgres_data`
volume. Copy `.env.example` to the ignored `.env` and fill private values securely.
For an existing PostgreSQL volume, use its existing username and password first:
POSTGRES_* variables only initialize a new volume and do not rotate an existing
role's password. Any rotation must be coordinated separately with the application.

```bash
# HTTP/loopback development only, with COOKIE_SECURE=false in .env:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
# Requires a usable Docker daemon: PostgreSQL and Redis Testcontainers are mandatory.
cd finance-tracker
bash mvnw --batch-mode verify
cd ../frontend
npm ci
npm test
npm run build
npm audit --audit-level=high
```

Node 24 and Java 17 are used by CI/build containers. H2 tests use their test-only
secret and disable Redis limiting; the dedicated Redis Testcontainers suite enables
and validates it. This does not disable production rate limiting. Tests use
isolated databases, not your application database. The cloud machine's Maven
invocation additionally uses its workspace JDK, proxy settings and system CA
truststore; those machine-specific overrides are not required on a normal laptop.

The pipeline's local host connection now needs the development Compose override.
Run its verified backup before applying database changes. The numbered
`finance-tracker/db/migrations/001_auth_sessions.sql` adds only the two session
tables and indexes. There is still no Flyway/Liquibase runner. Apply as an admin
before production startup with `HIBERNATE_DDL_AUTO=validate`:

```bash
# After a verified backup, using the current admin role; never echo its password:
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < finance-tracker/db/migrations/001_auth_sessions.sql
```

Development `update` creates the new tables; production uses the explicit script
and `validate`. These changes invalidate legacy access tokens; users sign in again.
No existing users, transactions, budgets, raw expenses or analytics definitions are
removed. Session records intentionally keep user IDs without a foreign key so a
deleted user's token can be rejected safely while retaining reuse/revocation state.
Retain consumed token hashes through the session's absolute 30-day lifetime.
For database maintenance, expired sessions and their credentials may be deleted
transactionally after that lifetime; no automatic cleanup scheduler is introduced.

## Authentication protocol

Login/register/refresh return an access token in JSON and set a host-only refresh
cookie at `/api/auth`. The cookie has a 30-day maximum age, while the server session
has an absolute 30-day expiry; rotation does not extend it. API data routes accept
only Bearer access tokens, never cookie authentication. Auth responses are no-store.

For non-browser API clients, send your exact allowed `Origin` plus
`X-Requested-With: FinanceTracker` on auth POSTs and maintain a cookie jar for
refresh/logout. Missing or untrusted origins and missing custom headers return 403.
`POST /api/auth/password` requires a Bearer token and JSON `currentPassword` plus
`newPassword`; successful changes revoke all the user's sessions.

The client coalesces concurrent refresh calls and retries a failed API request only
once. Where supported, Web Locks serialize refresh/logout across tabs. Strict
reuse detection treats a repeated old refresh token as compromise and revokes the
entire session. Clients without Web Locks should avoid simultaneous refreshes from
multiple tabs; collisions fail closed and require a new login. Logout errors stay
visible so the user can retry server-side revocation. In-flight API requests that
were authorized before logout may finish; subsequent requests are rejected.

A Redis outage blocks login/registration with 503; established sessions still
validate against PostgreSQL. Fixed windows and per-account throttling reduce
password guessing but are not a complete distributed-abuse defense. Nginx uses the
actual connecting peer IP, overwrites forwarding headers, and does not blindly
trust user-supplied IP headers. Behind a load balancer, configure trusted real-IP
ranges explicitly to preserve per-client edge limiting; never trust arbitrary
X-Forwarded-For.

## Production configuration and remaining deployment work

Mount a directory containing a CA-issued `fullchain.pem` and `privkey.pem` outside
Git; set `TLS_CERT_DIR` to it, `CORS_ORIGINS=https://your-real-domain`, and
`COOKIE_SECURE=true`. After the verified backup and migration:

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build -d
```

Only Nginx exposes ports 80 (redirect) and 443. Do not combine the production setup
with `docker-compose.dev.yml`. Verify certificate renewal, DNS, firewall rules,
external HTTPS, browser auth and backup recovery in the deployment environment.
An AWS TLS load balancer is an alternative, but is not provisioned here. If using
one, restrict access to the HTTP origin to that balancer and preserve equivalent
HTTPS redirect, HSTS and trusted proxy settings.

For production, use a non-superuser application DB role after administrator-led
schema creation; POSTGRES_USER is a bootstrap administrator and should not be the
production application's unrestricted role. Database bootstrap/role separation and
external secret delivery remain deployment responsibilities. Keep audit log
access restricted and forward logs to durable, access-controlled storage for
production retention/tamper protection; local rotating files are not tamper-proof.

Create the GitHub repository secret **NVD_API_KEY** for OWASP Dependency-Check.
The CI scan fails with an explicit configuration error if it is absent; it does
not silently skip the vulnerability gate. Java dependency CVEs and scan results
must be reviewed once that job executes. The Java NVD scan and GitHub-hosted CI
are not claimed verified merely because their workflow files exist.
The Gitleaks allowlist is scoped to the public deterministic JWT fixture in the
test profile only; it does not exempt deployment configuration or other secrets.

## Scope of validation

Backend tests, PostgreSQL/Redis containers, frontend client tests/build/npm audit,
Compose exposure checks, Nginx config checks and actual localhost HTTPS/security
headers are validated in the cloud workspace. The HTTPS check uses a temporary
certificate explicitly trusted for that check; it does not demonstrate a public
CA-issued production endpoint. Shared application database credentials and data
were not changed by the tests.

Final validation: 48 backend tests executed with zero failures/errors/skips,
including PostgreSQL 15, Redis, migration repeatability, cookie rotation/reuse,
concurrent refresh, revocation and privacy tests. Five frontend client tests passed;
production build succeeded and npm audit reported zero vulnerabilities. Gitleaks
reported no leaks after its narrowly scoped known-test-fixture allowance. Actionlint
validated both workflows; base/development/TLS Compose checks passed. Actual HTTPS
served the frontend with certificate verification and all expected security headers;
HTTP returned 308. The Java NVD vulnerability scan and public deployment remain
unverified.
