package com.nayan.finance_tracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/financedb",
    "spring.datasource.username=nayan",
    "spring.datasource.password=password",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "application.security.jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
    "application.security.jwt.expiration=86400000"
})
class FinanceTrackerApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context loads successfully with all beans
    }
}