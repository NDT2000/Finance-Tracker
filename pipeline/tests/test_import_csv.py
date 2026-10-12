import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_csv import parse_file


class CsvValidationTests(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.csv'
            path.write_text(text, encoding='utf-8')
            return parse_file(path)

    def test_exact_decimal_and_identity(self):
        text = 'date,category,description,amount,currency\n2026-01-01,Food,Test,0.10,USD\n'
        rows = self.parse(text)
        self.assertEqual(rows[0][5], Decimal('0.10'))
        self.assertEqual(rows[0][1], 1)
        self.assertEqual(rows, self.parse(text))
        self.assertNotEqual(rows[0][0], self.parse(text.replace('Test', 'Changed'))[0][0])

    def test_reject_invalid_amounts_without_rounding(self):
        for amount in ('0', '-1', '1.001', 'NaN', 'Infinity', '1e2', '10000000000000000'):
            with self.subTest(amount=amount), self.assertRaises(ValueError):
                self.parse(f'date,category,description,amount,currency\n2026-01-01,Food,Test,{amount},USD\n')

    def test_reject_bad_headers_date_currency_and_columns(self):
        header = 'date,category,description,amount,currency\n'
        for text in ('wrong\n', header, header+'2026-02-30,Food,Test,1.00,USD\n',
                     header+'2026-01-01,Food,Test,1.00,usd\n',
                     header+'2026-01-01,Food,Test,1.00\n',
                     header+'2026-01-01,Food,Test,1.00,USD,extra\n'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                self.parse(text)


if __name__ == '__main__':
    unittest.main()
