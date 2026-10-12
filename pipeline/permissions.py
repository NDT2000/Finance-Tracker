"""Fail closed if the importer role has broader persistent privileges."""
import psycopg


def verify_permissions(conn):
    role = 'finance_pipeline'
    with conn.cursor() as cur:
        cur.execute('''SELECT rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls
                       FROM pg_roles WHERE rolname=%s''', (role,))
        if cur.fetchone() != (False, False, False, False, False, False):
            raise ValueError('Pipeline role has unsafe attributes or is missing')
        cur.execute('''SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member
                       WHERE r.rolname=%s''', (role,))
        if cur.fetchone()[0]:
            raise ValueError('Pipeline role must have no role memberships')
        cur.execute('SELECT has_database_privilege(%s,current_database(),\'CREATE\')', (role,))
        if cur.fetchone()[0]:
            raise ValueError('Pipeline role can create persistent schemas')
        cur.execute('''SELECT nspname FROM pg_namespace
                       WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
                       AND (has_schema_privilege(%s,oid,'CREATE') OR nspowner=(SELECT oid FROM pg_roles WHERE rolname=%s))''', (role, role))
        if cur.fetchall():
            raise ValueError('Pipeline role can create or owns a persistent schema')
        cur.execute('''SELECT n.nspname,c.relname FROM pg_class c
            JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
              AND c.relkind IN ('r','p','v','m','f')''')
        for schema, table in cur.fetchall():
            allowed = {'SELECT','INSERT'} if (schema, table) == ('raw','expenses') else (
                {'SELECT'} if (schema, table) == ('analytics','monthly_spending') else set())
            for privilege in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'):
                cur.execute('SELECT has_table_privilege(%s,%s,%s)',
                            (role, psycopg.sql.Identifier(schema, table).as_string(conn), privilege))
                if cur.fetchone()[0] != (privilege in allowed):
                    raise ValueError(f'Unexpected {privilege} permission on {schema}.{table}')
        cur.execute('''SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE c.relkind='S' AND n.nspname !~ '^pg_'
              AND CASE WHEN c.relkind='S' THEN has_sequence_privilege(%s,c.oid,'USAGE,SELECT,UPDATE') ELSE false END''', (role,))
        if cur.fetchone()[0]:
            raise ValueError('Unexpected sequence access')
