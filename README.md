# Finance Tracker 

A full-stack personal finance application with ML-powered spend forecasting. Users track income and expenses, set category budgets, and receive month-end spending predictions with overspend warnings.

## Architecture

A microservice architecture with four containerized services:

- **Backend (Java / Spring Boot 3.2.5)** — REST API handling authentication, transactions, budgets, and forecast orchestration. Java 17.
- **ML Service (Python / FastAPI)** — Linear-regression spend forecasting, called by the backend over HTTP.
- **Frontend (React + Vite)** — Dashboard with Recharts visualizations, transaction/budget forms, and forecast display.
- **Database (PostgreSQL 15)** — Persistent storage for users, transactions, and budgets.

All services are orchestrated with Docker Compose, with an Nginx reverse proxy routing frontend traffic to the backend.

## Features

Start with the [project learning guide](docs/learning-guide.md) for the completed goal, sample walkthrough, application features and concepts to learn.

- **Financial planning** — Saved monthly what-if scenarios for salary/income, spending, investments, loan repayments and withdrawals, with cash-reserve warnings and independent copies. [Guide and calculation example](docs/financial-planning.md).

- **Reliable batch imports** — Authenticated CSV upload, durable processing/history, rejected-row reports, manual-overlap review, source revisions and refunds. [Pipeline guide and evidence](docs/pipeline/README.md).
- **Currency-aware monthly dashboard** — One canonical ledger for manual and imported entries, month/currency filters, exact totals and import freshness; existing forecasting and profile remain available.

- **JWT authentication** — Stateless auth with BCrypt password hashing. Credentials sent in the request body (not query params).
- **Transaction management** — Full CRUD with per-user data isolation and ownership checks.
- **Budget tracking** — Set monthly budgets per category via the UI.
- **ML spend forecasting** — For each budgeted category, the backend gathers the current month's expenses, calls the Python ML service, and returns a projected month-end total with an ON_TRACK / over-budget status.
- **Consistent error handling** — Global `@RestControllerAdvice` returns structured JSON errors with proper HTTP status codes (400, 403, 404, 409, 500).
- **Test suite** — JUnit/Mockito tests covering authentication, ownership/authorization, input validation, and forecast filtering.
- **CI/CD** — GitHub Actions pipeline runs tests against a live PostgreSQL instance, then builds and pushes Docker images.

## Tech Stack

**Backend:** Java 17, Spring Boot, Spring Security, Spring Data JPA, JWT
**ML:** Python, FastAPI, scikit-learn
**Frontend:** React, Vite, Recharts, Axios
**Database:** PostgreSQL 15
**Infra:** Docker, Docker Compose, Nginx, GitHub Actions

## Running Locally

Configuration uses environment variables for secrets (`JWT_SECRET`, database credentials). Set these before running.

### With Docker Compose (recommended)
```bash
# Create a .env file with JWT_SECRET and DB credentials, then:
docker-compose up
```

### Manually
```bash
# 1. Start PostgreSQL
docker run --name finance-db -e POSTGRES_USER=<user> -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=financedb -p 5432:5432 -d postgres:15

# 2. Start the backend (from the backend directory)
export JWT_SECRET=<your-secret>   # PowerShell: $env:JWT_SECRET="..."
./mvnw spring-boot:run

# 3. Start the ML service (from ml-service)
uvicorn main:app --reload --port 8000

# 4. Start the frontend (from frontend)
npm install
npm run dev
```

## Bank-linked transactions and downloads

Choose one of your saved bank accounts when adding an expense or income; refunds
use their original expense's account. Recent entries can also be assigned to a
bank without changing their financial values or import source history.

The dashboard's **Download transactions** section exports expenses, refunds and
income as a CSV report, with optional month/currency/type/account filters. See
[bank associations, migration and export contract](docs/bank-transactions-and-export.md).
Back up existing data before the first V5 upgrade; existing transactions remain
unassigned until an account is chosen.

## User profile

Sign in, then choose **My profile** in the dashboard header. The protected `/profile`
page has two menu options:

- **Personal details:** read-only full name and email, plus password change. Name
  updates are disabled on the server as well as in the UI.
- **Bank accounts:** save multiple named account entries with type and currency;
  delete an entry with confirmation. These are account labels, not live bank
  connections. Deleting an entry preserves transactions and import history.

Changing your password requires your current password, revokes all sessions, and
returns you to sign-in. New passwords retain the existing 15-character minimum,
72 UTF-8-byte maximum and common-password checks.

`GET /api/profile` returns only name and email; `PUT /api/profile` is no longer
supported. `GET/POST /api/accounts` and `DELETE /api/accounts/{id}` use the
signed-in owner. Other users' records are never listed or deleted; names must be
unique for that owner, ignoring case. No bank credentials or account numbers are
stored by this page. The profile menu reuses existing tables; the transaction-bank association is
added by Flyway V5.

## Running Tests
```bash
./mvnw test
```

## Security Notes

Secrets are managed via environment variables and are not committed to the repository. The `.env` file is gitignored.

## Known Limitations

- Budget creation is available via the UI; some administrative operations are API-only.
- The forecasting model (linear regression) is intentionally simple — the project's focus is the production architecture around the model rather than model sophistication.
