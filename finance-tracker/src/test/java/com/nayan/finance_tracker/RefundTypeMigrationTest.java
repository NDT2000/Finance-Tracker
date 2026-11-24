package com.nayan.finance_tracker;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V7 must let databases created by Hibernate before Flyway store refunds. Those databases carry a
 * legacy transactions_type_check allowing only INCOME and EXPENSE; this test recreates it, migrates,
 * and checks refunds are accepted while unknown types are still rejected.
 */
@Testcontainers
class RefundTypeMigrationTest {

    @Container
    static final PostgreSQLContainer<?> DB = new PostgreSQLContainer<>("postgres:15");

    @Test
    void legacyTypeConstraintIsReplacedSoRefundsCanBeStored() throws Exception {
        try (Connection connection = DriverManager.getConnection(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword())) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V1__baseline_finance_tracker.sql"));
            try (var statement = connection.createStatement()) {
                // The constraint Hibernate generated on pre-Flyway databases
                statement.execute("alter table transactions add constraint transactions_type_check check (type in ('INCOME','EXPENSE'))");
                statement.execute("insert into users(email,password,full_name,role) values('legacy@example.com','test-fixture','Legacy','USER')");
                statement.execute("insert into transactions(description,amount,type,category,date,user_id) values('Lamp',40,'EXPENSE','Home','2026-11-01',1)");
            }

            Flyway flyway = Flyway.configure().dataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword())
                .baselineOnMigrate(true).baselineVersion("1").load();
            flyway.migrate();
            flyway.validate();

            try (var statement = connection.createStatement()) {
                statement.execute("insert into transactions(description,amount,type,category,date,user_id,refund_of) "
                    + "values('Lamp refund',10,'REFUND','Home','2026-11-02',1,1)");
                var result = statement.executeQuery("select count(*) from transactions where type = 'REFUND'");
                result.next();
                assertThat(result.getInt(1)).isEqualTo(1);
                // Existing rows survive the migration unchanged
                result = statement.executeQuery("select description, amount from transactions where id = 1");
                result.next();
                assertThat(result.getString(1)).isEqualTo("Lamp");
                assertThat(result.getBigDecimal(2)).isEqualByComparingTo("40");
                // The replacement still guards the column against unknown types
                assertThatThrownBy(() -> statement.execute(
                    "insert into transactions(description,amount,type,category,date,user_id) values('Bad',1,'TRANSFER','Home','2026-11-03',1)"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("transactions_type_check");
            }
        }
    }
}
