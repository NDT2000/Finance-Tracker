import unittest
from models import ForecastRequest, Transaction, forecast_spending


class ForecastRefundTests(unittest.TestCase):
    def forecast(self, records):
        return forecast_spending(ForecastRequest(category='Food', transactions=[Transaction(amount=a, day=d) for a, d in records], budget_limit=200, current_month_days=30))

    def test_positive_single_expense_keeps_daily_projection(self):
        result = self.forecast([(25.10, 10)])
        self.assertEqual(result.total_spent_so_far, 25.10)
        self.assertEqual(result.predicted_month_end_total, 75.30)
        self.assertEqual(result.status, 'ON_TRACK')

    def test_refund_only_month_preserves_net_credit_but_not_negative_prediction(self):
        result = self.forecast([(-10, 6)])
        self.assertEqual(result.total_spent_so_far, -10)
        self.assertEqual(result.predicted_month_end_total, 0)
        self.assertEqual(result.overspend_amount, 0)

    def test_refunds_reduce_net_spending_in_regression(self):
        result = self.forecast([(10, 3), (35, 5), (-10, 6)])
        self.assertEqual(result.total_spent_so_far, 35)
        self.assertGreaterEqual(result.predicted_month_end_total, 35)


if __name__ == '__main__':
    unittest.main()
