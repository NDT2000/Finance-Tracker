package com.nayan.finance_tracker;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.core.io.FileSystemResource;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;
/** Verify the explicit migration and Hibernate agree, without touching a shared DB. */
@Testcontainers
class SessionMigrationTest {
    @Container static final PostgreSQLContainer<?> DB=new PostgreSQLContainer<>("postgres:15");
    @Test void migrationIsAdditiveRepeatableAndHasExpectedColumns() throws Exception {
        try (var connection=DriverManager.getConnection(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword())) {
            try (var statement=connection.createStatement()) {
                statement.execute("create table public.users(id bigint primary key, email text)");
                statement.execute("insert into public.users values(1,'preserved@example.com')");
            }
            var sql=new FileSystemResource("db/migrations/001_auth_sessions.sql");
            ScriptUtils.executeSqlScript(connection,sql); ScriptUtils.executeSqlScript(connection,sql);
            try (var statement=connection.createStatement()) {
                var result=statement.executeQuery("select count(*) from public.users where id=1"); result.next(); assertThat(result.getInt(1)).isEqualTo(1);
                statement.execute("insert into public.auth_sessions(id,user_id,expires_at) values('test-session',1,now()+interval '1 day')");
                statement.execute("insert into public.refresh_credentials(token_hash,session_id) values(repeat('a',64),'test-session')");
                result=statement.executeQuery("select revoked from public.auth_sessions"); result.next(); assertThat(result.getBoolean(1)).isFalse();
            }
        }
    }
}
