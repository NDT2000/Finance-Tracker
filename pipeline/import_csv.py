"""Import one synthetic expense CSV atomically; identical bytes are idempotent."""
import argparse
import csv
import hashlib
import io
import os
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
import re

import psycopg

FIELDS = ['date', 'category', 'description', 'amount', 'currency']


def parse_file(path):
    content = Path(path).read_bytes()
    digest = hashlib.sha256(content).hexdigest()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig'), newline=''))
    if reader.fieldnames != FIELDS:
        raise ValueError(f'Expected CSV columns in order: {FIELDS}')
    rows = []
    for number, row in enumerate(reader, 1):
        try:
            if None in row or any(v is None for v in row.values()):
                raise ValueError('Wrong column count')
            if not re.fullmatch(r'[0-9]+(?:\.[0-9]{1,2})?', row['amount']):
                raise ValueError('Amount must be positive decimal text with at most 2 decimal places')
            amount = Decimal(row['amount'])
            if not amount.is_finite() or not 0 < amount < Decimal('10000000000000000'):
                raise ValueError('Amount outside numeric(18,2) range')
            if not re.fullmatch(r'[A-Z]{3}', row['currency']):
                raise ValueError('Currency must be a three-letter uppercase code')
            if not row['category'].strip():
                raise ValueError('Category is required')
            rows.append((digest, number, date.fromisoformat(row['date']),
                         row['category'], row['description'], amount, row['currency']))
        except (ValueError, InvalidOperation) as exc:
            raise ValueError(f'CSV data row {number}: {exc}') from exc
    if not rows:
        raise ValueError('CSV has no expense rows')
    return rows


def import_file(path, account):
    if not account.startswith('synthetic:') or not account.removeprefix('synthetic:').strip():
        raise ValueError('Account must use a nonempty synthetic: prefix')
    rows = parse_file(path)  # Validate every row before starting database writes.
    inserted = 0
    with psycopg.connect(os.environ['PIPELINE_DATABASE_URL']) as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute('''INSERT INTO raw.expenses
                    (synthetic_account,file_sha256,row_number,expense_date,category,description,amount,currency)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (synthetic_account,file_sha256,row_number) DO NOTHING''',
                            (account, *row))
                inserted += cur.rowcount
    return len(rows), inserted


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv_path', type=Path)
    parser.add_argument('--account', required=True)
    args = parser.parse_args()
    try:
        total, inserted = import_file(args.csv_path, args.account)
    except (ValueError, KeyError, UnicodeError, OSError, psycopg.Error) as exc:
        # Do not print connection strings or server diagnostics containing secrets.
        if isinstance(exc, (ValueError, UnicodeError)):
            parser.exit(1, f'Import rejected: {exc}\n')
        parser.exit(1, f'Import failed ({type(exc).__name__}); check file, credentials and database access.\n')
    print(f'rows={total} inserted={inserted} already_present={total-inserted}')


if __name__ == '__main__':
    main()
