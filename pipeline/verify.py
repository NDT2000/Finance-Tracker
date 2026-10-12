"""Verify role boundaries and repeat-import counts and exact totals."""
import os
from pathlib import Path
from decimal import Decimal

import psycopg
from import_csv import import_file, parse_file
from permissions import verify_permissions

ACCOUNT = 'synthetic:day1-demo'
SAMPLE = Path(__file__).with_name('data') / 'expenses.csv'


def snapshot():
    with psycopg.connect(os.environ['PIPELINE_DATABASE_URL']) as conn:
        verify_permissions(conn)
        with conn.cursor() as cur:
            cur.execute('''SELECT month,currency,expense_count,total_spent
                FROM analytics.monthly_spending WHERE synthetic_account=%s ORDER BY month,currency''', (ACCOUNT,))
            return cur.fetchall()


def main():
    with psycopg.connect(os.environ['PIPELINE_DATABASE_URL']) as conn:
        verify_permissions(conn)
        if conn.execute('SELECT current_user').fetchone()[0] != 'finance_pipeline':
            raise ValueError('Verification must connect as finance_pipeline')
        # Each denied statement gets its own rolled-back transaction/savepoint.
        for statement in (
            'SELECT * FROM public.users LIMIT 0',
            'SELECT * FROM public.transactions LIMIT 0',
            'SELECT * FROM public.budgets LIMIT 0',
            'UPDATE raw.expenses SET description=description WHERE false',
            'DELETE FROM raw.expenses WHERE false',
            'TRUNCATE raw.expenses',
            'CREATE TABLE raw.permission_probe(id int)',
            'CREATE TABLE public.permission_probe(id int)',
            'CREATE SCHEMA pipeline_permission_probe',
        ):
            try:
                with conn.transaction(force_rollback=True):
                    conn.execute(statement)
            except psycopg.errors.InsufficientPrivilege:
                continue
            raise ValueError(f'Unexpected success: {statement}')
    first = import_file(SAMPLE, ACCOUNT)
    before = snapshot()
    second = import_file(SAMPLE, ACCOUNT)
    after = snapshot()
    expected = [('2026-01-01','USD',3,Decimal('42.35')),
                ('2026-02-01','USD',2,Decimal('27.65'))]
    actual = [(str(month),currency,count,total) for month,currency,count,total in after]
    if before != after or second != (5,0) or actual != expected:
        raise ValueError(f'Idempotency/totals check failed: {actual}')
    print(f'PASS limited permissions and denied writes; first={first}; second={second}')
    for row in actual:
        print(*row)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, psycopg.Error) as exc:
        raise SystemExit(f'Verification failed ({type(exc).__name__}); inspect configuration and expected data.') from None
