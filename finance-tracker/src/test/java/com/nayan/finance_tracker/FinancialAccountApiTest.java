package com.nayan.finance_tracker;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nayan.finance_tracker.dto.*;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.DuplicateResourceException;
import com.nayan.finance_tracker.repository.*;
import com.nayan.finance_tracker.service.FinancialAccountService;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class FinancialAccountApiTest {
  @Container static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:15");

  @DynamicPropertySource
  static void postgres(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", PG::getJdbcUrl);
    r.add("spring.datasource.username", PG::getUsername);
    r.add("spring.datasource.password", PG::getPassword);
    r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    r.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    r.add(
        "spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    r.add("spring.flyway.enabled", () -> true);
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired UserRepository users;
  @Autowired FinancialAccountRepository accounts;
  @Autowired FinancialAccountService service;
  @Autowired JdbcTemplate db;
  @Autowired PasswordEncoder passwords;
  static final String PASSWORD = "A unique account test passphrase 42!";

  @BeforeEach
  void clean() {
    for (String table :
        List.of(
            "import_rows",
            "import_identities",
            "import_batches",
            "refresh_credentials",
            "auth_sessions",
            "financial_accounts",
            "budgets",
            "transactions",
            "users")) db.update("delete from " + table);
  }

  User user(String name) {
    return users.save(
        User.builder()
            .email(name + "@example.com")
            .fullName(name)
            .role(Role.USER)
            .password(passwords.encode(PASSWORD))
            .build());
  }

  String token(User user) throws Exception {
    var result =
        mvc.perform(
                post("/api/auth/login")
                    .header("Origin", "http://localhost")
                    .header("X-Requested-With", "FinanceTracker")
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            Map.of("email", user.getEmail(), "password", PASSWORD))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  long create(String token, String name) throws Exception {
    var result =
        mvc.perform(
                post("/api/accounts")
                    .header("Authorization", "Bearer " + token)
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            Map.of("name", name, "type", "CHECKING", "currency", "USD"))))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
  }

  @Test
  void accountsRequireAuthentication() throws Exception {
    mvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/accounts").contentType("application/json").content("{}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/accounts/1")).andExpect(status().isUnauthorized());
  }

  @Test
  void multipleAccountsAreOwnedAndReturnOnlyDisplayMetadata() throws Exception {
    User alice = user("alice");
    User bob = user("bob");
    String access = token(alice);
    create(access, "First bank");
    mvc.perform(
            post("/api/accounts")
                .header("Authorization", "Bearer " + access)
                .contentType("application/json")
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "name",
                            "  Second bank  ",
                            "type",
                            "SAVINGS",
                            "currency",
                            "EUR",
                            "userId",
                            bob.getId(),
                            "balance",
                            999))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Second bank"))
        .andExpect(jsonPath("$.currency").value("EUR"))
        .andExpect(jsonPath("$.user").doesNotExist())
        .andExpect(jsonPath("$.balance").doesNotExist());
    mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + access))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2));
    mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + token(bob)))
        .andExpect(status().isOk())
        .andExpect(content().json("[]"));
    assertThat(accounts.findByUserOrderByCreatedAtAsc(alice))
        .hasSize(2)
        .allSatisfy(a -> assertThat(a.getBalance()).isZero());
  }

  @Test
  void caseInsensitiveDuplicatesAreRejectedOnlyWithinOwner() throws Exception {
    User alice = user("alice");
    User bob = user("bob");
    String access = token(alice);
    create(access, "My Bank");
    // Preserve legacy case-variant records allowed by the existing database constraint.
    accounts.saveAndFlush(
        FinancialAccount.builder()
            .user(alice)
            .name("my bank")
            .type(AccountType.CHECKING)
            .currency("USD")
            .balance(java.math.BigDecimal.ZERO)
            .build());
    mvc.perform(
            post("/api/accounts")
                .header("Authorization", "Bearer " + access)
                .contentType("application/json")
                .content("{\"name\":\"  my bank  \",\"type\":\"SAVINGS\",\"currency\":\"USD\"}"))
        .andExpect(status().isConflict());
    create(token(bob), "My Bank");
    assertThat(accounts.count()).isEqualTo(3);
  }

  @Test
  void deleteChecksOwnershipAndPreservesOtherAccountsAndTransactions() throws Exception {
    User alice = user("alice");
    User bob = user("bob");
    String access = token(alice);
    long first = create(access, "First");
    long second = create(access, "Second");
    mvc.perform(
            post("/api/transactions")
                .header("Authorization", "Bearer " + access)
                .contentType("application/json")
                .content(
                    "{\"description\":\"Coffee\",\"amount\":\"10.00\",\"category\":\"Food\",\"type\":\"EXPENSE\",\"date\":\"2026-10-03\"}"))
        .andExpect(status().isOk());
    mvc.perform(delete("/api/accounts/" + first).header("Authorization", "Bearer " + token(bob)))
        .andExpect(status().isNotFound());
    assertThat(accounts.findById(first)).isPresent();
    mvc.perform(delete("/api/accounts/" + first).header("Authorization", "Bearer " + access))
        .andExpect(status().isNoContent());
    mvc.perform(delete("/api/accounts/" + first).header("Authorization", "Bearer " + access))
        .andExpect(status().isNotFound());
    assertThat(accounts.findById(second)).isPresent();
    mvc.perform(get("/api/transactions").header("Authorization", "Bearer " + access))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));
  }

  @Test
  void invalidNamesTypesAndCurrenciesDoNotCreateAccounts() throws Exception {
    String access = token(user("alice"));
    List<Map<String, String>> invalid =
        List.of(
            Map.of("name", " ", "type", "CHECKING", "currency", "USD"),
            Map.of("name", "x".repeat(101), "type", "CHECKING", "currency", "USD"),
            Map.of("name", "Bank", "type", "UNKNOWN", "currency", "USD"),
            Map.of("name", "Bank", "type", "CHECKING", "currency", "ZZZ"),
            Map.of("name", "Bank", "type", "CHECKING", "currency", "usd"));
    for (var request : invalid)
      mvc.perform(
              post("/api/accounts")
                  .header("Authorization", "Bearer " + access)
                  .contentType("application/json")
                  .content(json.writeValueAsString(request)))
          .andExpect(status().isBadRequest());
    assertThat(accounts.count()).isZero();
  }

  @Test
  void concurrentDuplicateAddsHaveOneWinner() throws Exception {
    User owner = user("alice");
    var pool = Executors.newFixedThreadPool(4);
    try {
      List<Callable<Boolean>> jobs = new ArrayList<>();
      for (int i = 0; i < 6; i++) {
        String name = i % 2 == 0 ? "My Bank" : "my bank";
        jobs.add(
            () -> {
              try {
                service.create(owner, new CreateAccountRequest(name, AccountType.CHECKING, "USD"));
                return true;
              } catch (DuplicateResourceException ex) {
                return false;
              }
            });
      }
      int winners = 0;
      for (var result : pool.invokeAll(jobs)) if (result.get()) winners++;
      assertThat(winners).isEqualTo(1);
      assertThat(accounts.count()).isEqualTo(1);
    } finally {
      pool.shutdownNow();
    }
  }
}
