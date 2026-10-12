"""Apply the isolated Day 1 SQL as admin, then enable the restricted login."""
import getpass
import os
from pathlib import Path

import psycopg
from permissions import verify_permissions


def main():
    password = os.environ.get('PIPELINE_PASSWORD') or getpass.getpass('New pipeline role password: ')
    if not password:
        raise ValueError('A nonempty pipeline password is required')
    with psycopg.connect(os.environ['PIPELINE_ADMIN_DATABASE_URL']) as conn:
        conn.execute(Path(__file__).with_name('migrations').joinpath('001_expenses.sql').read_text())
        verify_permissions(conn)  # Roll back all setup if inherited privileges are unsafe.
        conn.execute(psycopg.sql.SQL('ALTER ROLE finance_pipeline LOGIN PASSWORD {}').format(
            psycopg.sql.Literal(password)))
    print('Applied 001_expenses.sql; verified limited permissions; pipeline login enabled.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, psycopg.Error) as exc:
        raise SystemExit(f'Provisioning failed ({type(exc).__name__}); inspect permissions/configuration securely.') from None
