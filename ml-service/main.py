from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import ForecastRequest, ForecastResponse, forecast_spending

app = FastAPI(
    title="Finance Tracker ML Service",
    description="Spend forecasting using linear regression",
    version="1.0.0"
)

# Allow Spring Boot to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-service"}

@app.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    return forecast_spending(request)