# Finance Tracker v2

A full-stack personal finance application with ML-powered spend forecasting. Users track income and expenses, set category budgets, and receive month-end spending predictions with overspend warnings.

## Architecture

A microservice architecture with four containerized services:

- **Backend (Java / Spring Boot 3.2.5)** — REST API handling authentication, transactions, budgets, and forecast orchestration. Java 17.
- **ML Service (Python / FastAPI)** — Linear-regression spend forecasting, called by the backend over HTTP.
- **Frontend (React + Vite)** — Dashboard with Recharts visualizations, transaction/budget forms, and forecast display.
- **Database (PostgreSQL 15)** — Persistent storage for users, transactions, and budgets.

All services are orchestrated with Docker Compose, with an Nginx reverse proxy routing frontend traffic to the backend.

## Features

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

## Running Tests
```bash
./mvnw test
```

## Security Notes

Secrets are managed via environment variables and are not committed to the repository. The `.env` file is gitignored.

## Known Limitations

- Budget creation is available via the UI; some administrative operations are API-only.
- The forecasting model (linear regression) is intentionally simple — the project's focus is the production architecture around the model rather than model sophistication.