package com.nayan.finance_tracker;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
/** Run the security contract against an isolated PostgreSQL 15 database. */
@Testcontainers
class SecurityPostgresTest extends SecurityRegressionTest {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:15");
    @DynamicPropertySource static void postgres(DynamicPropertyRegistry registry) {
        registry.add("spring.jpa.hibernate.ddl-auto",() -> "create");
        registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username",POSTGRES::getUsername);
        registry.add("spring.datasource.password",POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name",() -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect",() -> "org.hibernate.dialect.PostgreSQLDialect");
    }
}
