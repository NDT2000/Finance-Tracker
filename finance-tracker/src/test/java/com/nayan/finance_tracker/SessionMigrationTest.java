package com.nayan.finance_tracker;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.flywaydb.core.Flyway;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;
/** Verify existing-database baselining and additive Flyway session migration. */
@Testcontainers
class SessionMigrationTest {
    @Container static final PostgreSQLContainer<?> DB=new PostgreSQLContainer<>("postgres:15");
    @Test void migrationIsAdditiveRepeatableAndPreservesExistingUsers() throws Exception {
        try (var connection=DriverManager.getConnection(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword())) {
            try (var statement=connection.createStatement()) {
                statement.execute("create table public.users(id bigint primary key, email text)");
                statement.execute("insert into public.users values(1,'preserved@example.com')");
            }
            Flyway flyway=Flyway.configure().dataSource(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword())
                .baselineOnMigrate(true).baselineVersion("1").load();
            assertThat(flyway.migrate().migrationsExecuted).isEqualTo(2);
            assertThat(flyway.migrate().migrationsExecuted).isZero();
            flyway.validate();
            try (var statement=connection.createStatement()) {
                var result=statement.executeQuery("select count(*) from public.users where id=1"); result.next(); assertThat(result.getInt(1)).isEqualTo(1);
                statement.execute("insert into public.auth_sessions(id,user_id,expires_at) values('test-session',1,now()+interval '1 day')");
                statement.execute("insert into public.refresh_credentials(token_hash,session_id) values(repeat('a',64),'test-session')");
                result=statement.executeQuery("select revoked from public.auth_sessions"); result.next(); assertThat(result.getBoolean(1)).isFalse();
            }
        }
    }
}
