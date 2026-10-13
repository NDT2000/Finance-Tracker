package com.nayan.finance_tracker;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.planning.*;
import com.nayan.finance_tracker.repository.*;
import java.math.BigDecimal;
import java.util.*;
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
class FinancialPlanningTest {
  @Container static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:15");

  @DynamicPropertySource
  static void pg(DynamicPropertyRegistry r) {
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
  @Autowired JdbcTemplate db;
  @Autowired PasswordEncoder passwords;
  @Autowired PlanRepository plans;
  @Autowired EventRepository events;
  static final String PASSWORD = "A unique planning test passphrase 42!";

  @BeforeEach
  void clean() {
    for (String t :
        List.of(
            "plan_events",
            "financial_plans",
            "import_rows",
            "import_identities",
            "import_batches",
            "refresh_credentials",
            "auth_sessions",
            "financial_accounts",
            "budgets",
            "transactions",
            "users")) db.update("delete from " + t);
  }

  User owner(String n) {
    return users.save(
        User.builder()
            .email(n + "@example.com")
            .fullName(n)
            .role(Role.USER)
            .password(passwords.encode(PASSWORD))
            .build());
  }

  String token(User u) throws Exception {
    var r =
        mvc.perform(
                post("/api/auth/login")
                    .header("Origin", "http://localhost")
                    .header("X-Requested-With", "FinanceTracker")
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            Map.of("email", u.getEmail(), "password", PASSWORD))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(r.getResponse().getContentAsString()).get("token").asText();
  }

  Map<String, Object> config() {
    return new LinkedHashMap<>(
        Map.of(
            "name",
            "My scenario",
            "currency",
            "USD",
            "startMonth",
            "2026-11",
            "months",
            3,
            "openingCash",
            "1000.00",
            "openingInvestments",
            "500.00",
            "cashReserve",
            "600.00",
            "annualReturnPercent",
            "0"));
  }

  String plan(String a, Map<String, Object> body) throws Exception {
    var r =
        mvc.perform(
                post("/api/plans")
                    .header("Authorization", "Bearer " + a)
                    .contentType("application/json")
                    .content(json.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(r.getResponse().getContentAsString()).get("id").asText();
  }

  Map<String, Object> event(
      String n, String kind, String amount, String repeat, int first, int last) {
    return Map.of(
        "name",
        n,
        "kind",
        kind,
        "amount",
        amount,
        "recurrence",
        repeat,
        "firstMonth",
        first,
        "lastMonth",
        last);
  }

  String add(String a, String id, Map<String, Object> body) throws Exception {
    var r =
        mvc.perform(
                post("/api/plans/" + id + "/events")
                    .header("Authorization", "Bearer " + a)
                    .contentType("application/json")
                    .content(json.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(r.getResponse().getContentAsString()).get("id").asText();
  }

  JsonNode projection(String a, String id) throws Exception {
    var r =
        mvc.perform(
                get("/api/plans/" + id + "/projection?baselineMonth=2026-09")
                    .header("Authorization", "Bearer " + a))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(r.getResponse().getContentAsString());
  }

  void exact(JsonNode node, String key, String value) {
    assertThat(new BigDecimal(node.get(key).asText())).isEqualByComparingTo(value);
  }

  @Test
  void allFiveKindsReconcileByHandWithoutDoubleCountingTransfers() throws Exception {
    String a = token(owner("alice")), id = plan(a, config());
    add(a, id, event("Salary", "INCOME", "2000.00", "MONTHLY", 1, 3));
    add(a, id, event("Living", "EXPENSE", "1200.00", "MONTHLY", 1, 3));
    add(a, id, event("Invest", "INVESTMENT", "300.00", "MONTHLY", 1, 3));
    add(a, id, event("Loan", "LOAN_REPAYMENT", "400.00", "MONTHLY", 1, 3));
    add(a, id, event("Sale", "WITHDRAWAL", "200.00", "ONCE", 2, 2));
    var p = projection(a, id);
    exact(p, "closingCash", "1500.00");
    exact(p, "closingInvestments", "1200.00");
    exact(p, "minimumCash", "1000.00");
    exact(p.get("months").get(0), "closingCash", "1100.00");
    exact(p.get("months").get(1), "closingCash", "1400.00");
    exact(p.get("months").get(2), "cashAndInvestments", "2700.00");
    assertThat(p.get("firstCashShortfall").isNull()).isTrue();
    assertThat(db.queryForObject("select count(*) from transactions", Integer.class)).isZero();
  }

  @Test
  void scheduledEventsProduceVisibleCashAndReserveShortfalls() throws Exception {
    String a = token(owner("alice"));
    var cfg = config();
    cfg.put("openingCash", "100.00");
    cfg.put("openingInvestments", "0");
    cfg.put("cashReserve", "200.00");
    String id = plan(a, cfg);
    add(a, id, event("Delayed salary", "INCOME", "100.00", "MONTHLY", 2, 3));
    add(a, id, event("One purchase", "EXPENSE", "500.00", "ONCE", 2, 2));
    var p = projection(a, id);
    exact(p, "closingCash", "-200.00");
    exact(p, "minimumCash", "-300.00");
    assertThat(p.get("firstCashShortfall").asText()).isEqualTo("2026-12");
    assertThat(p.get("firstBelowReserve").asText()).isEqualTo("2026-11");
    exact(p.get("months").get(0), "spending", "0");
    exact(p.get("months").get(2), "spending", "0");
  }

  @Test
  void withdrawalsNeverInventInvestmentFunding() throws Exception {
    String a = token(owner("alice"));
    var cfg = config();
    cfg.put("openingCash", "0");
    cfg.put("openingInvestments", "100.00");
    cfg.put("cashReserve", "0");
    String id = plan(a, cfg);
    add(a, id, event("Sell more than held", "WITHDRAWAL", "150.00", "ONCE", 1, 1));
    var p = projection(a, id);
    exact(p, "closingCash", "100.00");
    exact(p, "closingInvestments", "0");
    exact(p, "totalUnfundedWithdrawals", "50.00");
    exact(p.get("months").get(0), "requestedWithdrawals", "150.00");
    exact(p.get("months").get(0), "fundedWithdrawals", "100.00");
  }

  @Test
  void growthIsCurrencyRoundedAndNeverTreatedAsCashIncome() throws Exception {
    String a = token(owner("alice"));
    var cfg = config();
    cfg.put("openingInvestments", "100.00");
    cfg.put("annualReturnPercent", "12");
    String id = plan(a, cfg);
    add(a, id, event("Contribution", "INVESTMENT", "100.00", "MONTHLY", 1, 3));
    var p = projection(a, id);
    exact(p, "closingCash", "700.00");
    exact(p, "closingInvestments", "409.07");
    exact(p, "totalInvestmentGrowth", "9.07");
    exact(p.get("months").get(0), "income", "0");
    cfg.put("currency", "JPY");
    cfg.put("cashReserve", "0");
    cfg.put("openingCash", "1000");
    cfg.put("openingInvestments", "100");
    String jpy = plan(a, cfg);
    add(a, jpy, event("Whole-yen contribution", "INVESTMENT", "50", "MONTHLY", 1, 3));
    var j = projection(a, jpy);
    exact(j, "closingInvestments", "257");
    exact(j, "totalInvestmentGrowth", "7");
    cfg.put("currency", "USD");
    cfg.put("months", 1);
    cfg.put("openingInvestments", "1000");
    cfg.put("annualReturnPercent", "-12");
    var loss = projection(a, plan(a, cfg));
    exact(loss, "closingInvestments", "990.00");
    exact(loss, "closingCash", "1000.00");
  }

  @Test
  void validationProtectsRangesPrecisionCurrencyAndExistingEvents() throws Exception {
    String a = token(owner("alice"));
    for (var replacement :
        List.<Map.Entry<String, Object>>of(
            Map.entry("months", 37),
            Map.entry("startMonth", "0000-01"),
            Map.entry("startMonth", "2026-13"),
            Map.entry("currency", "ZZZ"),
            Map.entry("openingInvestments", "-1"),
            Map.entry("cashReserve", "-1"),
            Map.entry("annualReturnPercent", "101"),
            Map.entry("openingCash", "1.001"))) {
      var cfg = config();
      cfg.put(replacement.getKey(), replacement.getValue());
      mvc.perform(
              post("/api/plans")
                  .header("Authorization", "Bearer " + a)
                  .contentType("application/json")
                  .content(json.writeValueAsString(cfg)))
          .andExpect(status().isBadRequest());
    }
    String id = plan(a, config());
    String event = add(a, id, event("Salary", "INCOME", "2000.00", "MONTHLY", 1, 3));
    var shortCfg = config();
    shortCfg.put("months", 2);
    mvc.perform(
            put("/api/plans/" + id)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(json.writeValueAsString(shortCfg)))
        .andExpect(status().isConflict());
    var currency = config();
    currency.put("currency", "EUR");
    mvc.perform(
            put("/api/plans/" + id)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(json.writeValueAsString(currency)))
        .andExpect(status().isConflict());
    for (var body :
        List.of(
            event("Bad", "EXPENSE", "0", "MONTHLY", 1, 3),
            event("Bad", "EXPENSE", "1.001", "MONTHLY", 1, 3),
            event("Bad", "EXPENSE", "10", "MONTHLY", 2, 4),
            event("Bad", "EXPENSE", "10", "ONCE", 1, 2)))
      mvc.perform(
              post("/api/plans/" + id + "/events")
                  .header("Authorization", "Bearer " + a)
                  .contentType("application/json")
                  .content(json.writeValueAsString(body)))
          .andExpect(status().isBadRequest());
    mvc.perform(
            put("/api/plans/" + id + "/events/" + event)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(
                    json.writeValueAsString(event("Salary", "INCOME", "2000.00", "MONTHLY", 1, 2))))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/plans/" + id)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(json.writeValueAsString(shortCfg)))
        .andExpect(status().isOk());
    assertThat(projection(a, id).get("months").size()).isEqualTo(2);
  }

  @Test
  void ownershipCoversPlansEventsCopiesAndProjections() throws Exception {
    String a = token(owner("alice")),
        b = token(owner("bob")),
        id = plan(a, config()),
        other = plan(b, config()),
        e = add(b, other, event("Private", "EXPENSE", "10", "ONCE", 1, 1));
    for (String path :
        List.of(
            "/api/plans/" + other,
            "/api/plans/" + other + "/events",
            "/api/plans/" + other + "/projection"))
      mvc.perform(get(path).header("Authorization", "Bearer " + a))
          .andExpect(status().isNotFound());
    mvc.perform(post("/api/plans/" + other + "/copy").header("Authorization", "Bearer " + a))
        .andExpect(status().isNotFound());
    mvc.perform(delete("/api/plans/" + other).header("Authorization", "Bearer " + a))
        .andExpect(status().isNotFound());
    mvc.perform(
            put("/api/plans/" + other)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(json.writeValueAsString(config())))
        .andExpect(status().isNotFound());
    mvc.perform(
            put("/api/plans/" + id + "/events/" + e)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(json.writeValueAsString(event("Injection", "EXPENSE", "1", "ONCE", 1, 1))))
        .andExpect(status().isNotFound());
    mvc.perform(delete("/api/plans/" + id + "/events/" + e).header("Authorization", "Bearer " + a))
        .andExpect(status().isNotFound());
    assertThat(events.count()).isEqualTo(1);
    mvc.perform(get("/api/plans").header("Authorization", "Bearer " + a))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));
  }

  @Test
  void copyEditDeleteDoNotAffectOriginalOrActualLedger() throws Exception {
    User u = owner("alice");
    String a = token(u), id = plan(a, config());
    add(a, id, event("Salary", "INCOME", "100", "MONTHLY", 1, 3));
    var r =
        mvc.perform(post("/api/plans/" + id + "/copy").header("Authorization", "Bearer " + a))
            .andExpect(status().isCreated())
            .andReturn();
    String copy = json.readTree(r.getResponse().getContentAsString()).get("id").asText();
    assertThat(events.count()).isEqualTo(2);
    var copied =
        events
            .findByPlanOrderByFirstMonthAscIdAsc(
                plans.findById(UUID.fromString(copy)).orElseThrow())
            .get(0);
    mvc.perform(
            put("/api/plans/" + copy + "/events/" + copied.getId())
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(
                    json.writeValueAsString(
                        event("Salary changed", "INCOME", "200", "MONTHLY", 1, 3))))
        .andExpect(status().isOk());
    exact(projection(a, id), "closingCash", "1300.00");
    exact(projection(a, copy), "closingCash", "1600.00");
    mvc.perform(delete("/api/plans/" + copy).header("Authorization", "Bearer " + a))
        .andExpect(status().isNoContent());
    assertThat(plans.count()).isEqualTo(1);
    assertThat(events.count()).isEqualTo(1);
    assertThat(db.queryForObject("select count(*) from transactions", Integer.class)).isZero();
  }

  @Test
  void actualComparisonIsOwnerScopedAndReferenceOnly() throws Exception {
    String a = token(owner("alice")), b = token(owner("bob"));
    mvc.perform(
            post("/api/transactions")
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(
                    "{\"description\":\"Actual"
                        + " salary\",\"category\":\"Other\",\"type\":\"INCOME\",\"amount\":\"700.00\",\"date\":\"2026-09-01\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/transactions")
                .header("Authorization", "Bearer " + b)
                .contentType("application/json")
                .content(
                    "{\"description\":\"Other"
                        + " owner\",\"category\":\"Other\",\"type\":\"INCOME\",\"amount\":\"999.00\",\"date\":\"2026-09-01\"}"))
        .andExpect(status().isOk());
    String id = plan(a, config());
    var p = projection(a, id);
    exact(p.get("actualBaseline"), "income", "700.00");
    exact(p, "closingCash", "1000.00");
    assertThat(p.get("actualBaseline").get("transactionCount").asInt()).isEqualTo(1);
    mvc.perform(
            get("/api/plans/" + id + "/projection?baselineMonth=invalid")
                .header("Authorization", "Bearer " + a))
        .andExpect(status().isBadRequest());
    assertThat(db.queryForObject("select count(*) from transactions", Integer.class)).isEqualTo(2);
  }

  @Test
  void anonymousRequestsCannotReadOrWritePlans() throws Exception {
    mvc.perform(get("/api/plans")).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/plans")
                .contentType("application/json")
                .content(json.writeValueAsString(config())))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/plans/" + UUID.randomUUID() + "/projection"))
        .andExpect(status().isUnauthorized());
  }
}
