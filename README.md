# Finance Tracker v2

Budget tracking app with ML-powered spend forecasting.

## Stack
- Java 17, Spring Boot 3.2.5
- PostgreSQL 15 (Docker)
- Python FastAPI + scikit-learn (planned)
- React + TailwindCSS (planned)
- Docker Compose, GitHub Actions

## Run locally

```bash
# Start database
docker run --name finance-db \
  -e POSTGRES_USER=nayan \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=financedb \
  -p 5432:5432 -d postgres:15

# Run app
./mvnw spring-boot:run
```

- [x] JWT auth (register + login)
- [x] Transaction CRUD
- [x] Budget tracking
- [x] ML spend forecasting
- [x] React frontend
- [x] Docker Compose
- [x] CI/CD + GitHub Actions

## License
MIT
