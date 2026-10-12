-- Keep currencies separate: no conversion or cross-currency summation.
SELECT synthetic_account, month, currency, expense_count, total_spent
FROM analytics.monthly_spending
WHERE synthetic_account = 'synthetic:day1-demo'
ORDER BY month, currency;
