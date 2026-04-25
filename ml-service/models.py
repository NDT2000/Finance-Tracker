from sklearn.linear_model import LinearRegression
import numpy as np
from typing import List
from pydantic import BaseModel

class Transaction(BaseModel):
    amount: float
    day: int

class ForecastRequest(BaseModel):
    category: str
    transactions: List[Transaction]
    budget_limit: float
    current_month_days: int = 30

class ForecastResponse(BaseModel):
    category: str
    total_spent_so_far: float
    predicted_month_end_total: float
    budget_limit: float
    status: str
    overspend_amount: float
    confidence: str

def forecast_spending(request: ForecastRequest) -> ForecastResponse:
    transactions = request.transactions
    total_spent = sum(t.amount for t in transactions)
    
    # Need at least 3 transactions to run regression
    # If fewer, use  simple daily average projection
    if len(transactions) < 2:
        if len(transactions) == 0:
            predicted_total = 0.0
        else:
            # SImple average: spent / days elasped * total days
            days_elapsed = max(t.day for t in transactions)
            daily_avg = total_spent / days_elapsed
            predicted_total = daily_avg * request.current_month_days
        confidence = "LOW"
    else:
        # Linear regression: day -> cumulative spending
        #  Build cumulative spending by day
        sorted_transactions = sorted(transactions, key=lambda t: t.day)

        days = []
        cumulative = []
        running_total = 0.0

        for t in sorted_transactions:
            running_total += t.amount
            days.append(t.day)
            cumulative.append(running_total)
    
        #  Fit linear regression
        X = np.array(days).reshape(-1, 1)
        y = np.array(cumulative)

        model = LinearRegression()
        model.fit(X, y)

        # Predict total at the end of the month
        predicted_total = float(
            model.predict([[request.current_month_days]])[0]
        )

        # Confidence based on number of total data points
        if len(transactions) >= 10:
            confidence = "HIGH"
        elif len(transactions) >= 5:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"
    # Ensure prediction is not negative
    predicted_total = max(predicted_total, total_spent)

    # Determine status
    overspend = max(0.0, predicted_total - request.budget_limit)
    status = "WILL OVERSPEND" if predicted_total > request.budget_limit \
        else "ON TRACK"

    return ForecastResponse(
        category=request.category,
        total_spent_so_far=round(total_spent, 2),
        predicted_month_end_total=round(predicted_total, 2),
        budget_limit=request.budget_limit,
        status=status,
        overspend_amount=round(overspend, 2),
        confidence=confidence
    )
