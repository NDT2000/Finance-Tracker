package com.nayan.finance_tracker;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.pipeline.*;
import com.nayan.finance_tracker.repository.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.*;
import org.apache.commons.csv.*;
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
class BankTransactionsExportTest {
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
  @Autowired JdbcTemplate db;
  @Autowired PasswordEncoder passwords;
  @Autowired TransactionRepository transactions;
  @Autowired AnalyticsService analytics;
  @Autowired BatchService batches;
  @Autowired BatchWorker worker;
  static final String PASSWORD = "A unique bank transaction passphrase 42!";

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

  User owner(String name) {
    return users.save(
        User.builder()
            .email(name + "@example.com")
            .fullName(name)
            .role(Role.USER)
            .password(passwords.encode(PASSWORD))
            .build());
  }

  String token(User u) throws Exception {
    var result =
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
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  long bank(String access, String name, String currency) throws Exception {
    var result =
        mvc.perform(
                post("/api/accounts")
                    .header("Authorization", "Bearer " + access)
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            Map.of("name", name, "type", "CHECKING", "currency", currency))))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
  }

  Map<String, Object> values(
      String description,
      String type,
      String amount,
      String currency,
      String date,
      Long bank,
      Long refund) {
    Map<String, Object> v =
        new LinkedHashMap<>(
            Map.of(
                "description",
                description,
                "category",
                "Food",
                "type",
                type,
                "amount",
                amount,
                "currency",
                currency,
                "date",
                date));
    v.put("bankAccountId", bank);
    v.put("refundOf", refund);
    return v;
  }

  JsonNode create(
      String access,
      String description,
      String type,
      String amount,
      String currency,
      String date,
      Long bank,
      Long refund)
      throws Exception {
    var result =
        mvc.perform(
                post("/api/transactions")
                    .header("Authorization", "Bearer " + access)
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            values(description, type, amount, currency, date, bank, refund))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString());
  }

  List<CSVRecord> report(String access, String query) throws Exception {
    var result =
        mvc.perform(
                get("/api/transactions/export" + query).header("Authorization", "Bearer " + access))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        "attachment; filename=\"finance-transactions-report.csv\""))
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andReturn();
    try (var csv =
        CSVParser.parse(
            result.getResponse().getContentAsString(StandardCharsets.UTF_8),
            CSVFormat.RFC4180.builder().setHeader().setSkipHeaderRecord(true).get())) {
      return csv.getRecords();
    }
  }

  @Test
  void expensesAndIncomeUseOwnedCurrencyMatchingBanksAndRefundsInherit() throws Exception {
    User alice = owner("alice"), bob = owner("bob");
    String a = token(alice), b = token(bob);
    long usd = bank(a, "USD Bank", "USD"),
        eur = bank(a, "EUR Bank", "EUR"),
        foreign = bank(b, "Foreign Bank", "USD");
    var expense = create(a, "Coffee", "EXPENSE", "10.00", "USD", "2026-10-03", usd, null);
    var income = create(a, "Pay", "INCOME", "100.00", "USD", "2026-10-01", usd, null);
    var refund =
        create(
            a, "Return", "REFUND", "2.00", "USD", "2026-10-04", null, expense.get("id").asLong());
    for (var tx : List.of(expense, income, refund)) {
      assertThat(tx.get("bankAccountId").asLong()).isEqualTo(usd);
      assertThat(tx.get("bankAccountName").asText()).isEqualTo("USD Bank");
    }
    for (long bad : List.of(foreign, eur))
      mvc.perform(
              post("/api/transactions")
                  .header("Authorization", "Bearer " + a)
                  .contentType("application/json")
                  .content(
                      json.writeValueAsString(
                          values("Bad", "EXPENSE", "1.00", "USD", "2026-10-01", bad, null))))
          .andExpect(bad == foreign ? status().isNotFound() : status().isBadRequest());
    assertThat(transactions.findByUserAndDeletedFalse(alice)).hasSize(3);
  }

  @Test
  void deletingBankRetainsHistoricalLabelsAmountsAndRefunds() throws Exception {
    User u = owner("alice");
    String a = token(u);
    long bank = bank(a, "Historic Bank", "USD");
    var expense = create(a, "Coffee", "EXPENSE", "10.10", "USD", "2026-10-03", bank, null);
    create(a, "Return", "REFUND", "1.10", "USD", "2026-10-04", null, expense.get("id").asLong());
    String before =
        (String) analytics.summary(u.getId(), YearMonth.of(2026, 10), "USD").get("netExpenses");
    mvc.perform(delete("/api/accounts/" + bank).header("Authorization", "Bearer " + a))
        .andExpect(status().isNoContent());
    assertThat(transactions.findByUserAndDeletedFalse(u))
        .hasSize(2)
        .allSatisfy(
            t -> {
              assertThat(t.getBankAccountId()).isNull();
              assertThat(t.getBankAccountName()).isEqualTo("Historic Bank");
            });
    assertThat(analytics.summary(u.getId(), YearMonth.of(2026, 10), "USD").get("netExpenses"))
        .isEqualTo(before);
    assertThat(report(a, ""))
        .allSatisfy(
            r -> {
              assertThat(r.get("bank_account_name")).isEqualTo("Historic Bank");
              assertThat(r.get("bank_account_id")).isEmpty();
            });
  }

  @Test
  void bankReassignmentPropagatesToExcludedRefundsAndCannotTargetAnotherUser() throws Exception {
    User u = owner("alice"), other = owner("bob");
    String a = token(u), b = token(other);
    long first = bank(a, "First", "USD"), second = bank(a, "Second", "USD");
    var expense = create(a, "Coffee", "EXPENSE", "10.00", "USD", "2026-10-03", first, null);
    long id = expense.get("id").asLong();
    long refund =
        create(a, "Return", "REFUND", "1.00", "USD", "2026-10-04", null, id).get("id").asLong();
    mvc.perform(delete("/api/transactions/" + refund).header("Authorization", "Bearer " + a))
        .andExpect(status().isNoContent());
    mvc.perform(
            put("/api/transactions/" + id + "/bank-account")
                .header("Authorization", "Bearer " + b)
                .contentType("application/json")
                .content("{\"bankAccountId\":null}"))
        .andExpect(status().isNotFound());
    mvc.perform(
            put("/api/transactions/" + id + "/bank-account")
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content("{\"bankAccountId\":" + second + "}"))
        .andExpect(status().isOk());
    assertThat(transactions.findById(refund).orElseThrow().getBankAccountId()).isEqualTo(second);
    mvc.perform(
            post("/api/transactions/" + refund + "/restore").header("Authorization", "Bearer " + a))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bankAccountId").value(second));
    mvc.perform(
            put("/api/transactions/" + refund + "/bank-account")
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content("{\"bankAccountId\":null}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            put("/api/transactions/" + id)
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content(
                    json.writeValueAsString(
                        values("Coffee", "EXPENSE", "10.00", "USD", "2026-10-03", first, null))))
        .andExpect(status().isBadRequest());
    assertThat(transactions.findById(id).orElseThrow().getBankAccountId()).isEqualTo(second);
  }

  byte[] csv(String rows) {
    return ("date,category,description,amount,currency,type,source_transaction_id,revision,refund_of\n"
            + rows)
        .getBytes(StandardCharsets.UTF_8);
  }

  @Test
  void importedCorrectionsPreserveAssignedBanksAndRejectIncompatibleCurrency() throws Exception {
    User u = owner("alice");
    String a = token(u);
    long bank = bank(a, "Import Bank", "USD");
    UUID original =
        (UUID)
            batches
                .upload(
                    u.getId(),
                    "source",
                    "one.csv",
                    csv("2026-10-03,Food,Purchase,20.00,USD,EXPENSE,pay-1,1,\n"))
                .get("id");
    worker.runOnce();
    long id =
        ((Number) batches.rows(original, u.getId(), 0, false).get(0).get("transaction_id"))
            .longValue();
    mvc.perform(
            put("/api/transactions/" + id + "/bank-account")
                .header("Authorization", "Bearer " + a)
                .contentType("application/json")
                .content("{\"bankAccountId\":" + bank + "}"))
        .andExpect(status().isOk());
    batches.upload(
        u.getId(),
        "source",
        "two.csv",
        csv(
            "2026-10-03,Food,Purchase,25.00,USD,EXPENSE,pay-1,2,\n"
                + "2026-10-04,Food,Return,5.00,USD,REFUND,return-1,1,pay-1\n"));
    worker.runOnce();
    assertThat(transactions.findById(id).orElseThrow().getAmount()).isEqualByComparingTo("25.00");
    assertThat(transactions.findByUserAndDeletedFalse(u))
        .allSatisfy(t -> assertThat(t.getBankAccountId()).isEqualTo(bank));
    UUID bad =
        (UUID)
            batches
                .upload(
                    u.getId(),
                    "source",
                    "bad.csv",
                    csv("2026-10-03,Food,Purchase,30.00,EUR,EXPENSE,pay-1,3,\n"))
                .get("id");
    worker.runOnce();
    assertThat(batches.rows(bad, u.getId(), 0, false).get(0).get("status")).isEqualTo("REJECTED");
    assertThat(transactions.findById(id).orElseThrow().getAmount()).isEqualByComparingTo("25.00");
  }

  @Test
  void exportContainsOnlyOwnActiveRecordsWithExactAmountsAndCsvEscaping() throws Exception {
    User u = owner("alice"), other = owner("bob");
    String a = token(u), b = token(other);
    long bank = bank(a, "My, \"Bank\"", "USD");
    String description = "Lunch, \"shared\"\nsecond line";
    long expense =
        create(a, description, "EXPENSE", "42.10", "USD", "2026-10-03", bank, null)
            .get("id")
            .asLong();
    create(a, "Salary", "INCOME", "100.50", "USD", "2026-10-01", bank, null);
    create(a, "Return", "REFUND", "5.10", "USD", "2026-10-04", null, expense);
    long excluded =
        create(a, "Excluded", "EXPENSE", "2.00", "USD", "2026-10-05", null, null)
            .get("id")
            .asLong();
    mvc.perform(delete("/api/transactions/" + excluded).header("Authorization", "Bearer " + a))
        .andExpect(status().isNoContent());
    create(b, "Another owner's transaction", "INCOME", "999.99", "USD", "2026-10-01", null, null);
    var rows = report(a, "");
    assertThat(rows).hasSize(3);
    assertThat(rows.stream().map(r -> r.get("type")))
        .containsExactly("INCOME", "EXPENSE", "REFUND");
    assertThat(rows.get(1).get("description")).isEqualTo(description);
    assertThat(rows.get(1).get("bank_account_name")).isEqualTo("My, \"Bank\"");
    assertThat(new BigDecimal(rows.get(1).get("amount"))).isEqualByComparingTo("42.10");
    assertThat(new BigDecimal(rows.get(2).get("amount"))).isEqualByComparingTo("5.10");
    assertThat(rows.get(2).get("refund_of")).isEqualTo(String.valueOf(expense));
    assertThat(rows.get(0).isMapped("password")).isFalse();
  }

  @Test
  void exportFiltersAreAppliedTogetherAndInvalidOrForeignFiltersAreRejected() throws Exception {
    User u = owner("alice"), other = owner("bob");
    String a = token(u), b = token(other);
    long usd = bank(a, "USD", "USD"),
        eur = bank(a, "EUR", "EUR"),
        foreign = bank(b, "Foreign", "USD");
    create(a, "October pay", "INCOME", "100.00", "USD", "2026-10-01", usd, null);
    create(a, "September pay", "INCOME", "200.00", "USD", "2026-09-01", usd, null);
    create(a, "Euro pay", "INCOME", "300.00", "EUR", "2026-10-01", eur, null);
    create(a, "Expense", "EXPENSE", "10.00", "USD", "2026-10-03", usd, null);
    assertThat(report(a, "?month=2026-10&currency=USD&type=INCOME&bankAccountId=" + usd))
        .hasSize(1)
        .allSatisfy(r -> assertThat(r.get("description")).isEqualTo("October pay"));
    assertThat(report(a, "?month=2026-11")).isEmpty();
    mvc.perform(
            get("/api/transactions/export?bankAccountId=" + foreign)
                .header("Authorization", "Bearer " + a))
        .andExpect(status().isNotFound());
    for (String query :
        List.of(
            "?month=bad", "?month=2026-13", "?month=0000-01", "?currency=ZZZ", "?type=TRANSFER"))
      mvc.perform(get("/api/transactions/export" + query).header("Authorization", "Bearer " + a))
          .andExpect(status().isBadRequest());
  }

  @Test
  void spreadsheetFormulaCellsAreProtectedWithoutChangingStoredData() throws Exception {
    User u = owner("alice");
    String a = token(u);
    long bank = bank(a, "@malicious-bank", "USD");
    long id =
        create(a, "  =1+1", "EXPENSE", "10.00", "USD", "2026-10-01", bank, null).get("id").asLong();
    var row = report(a, "").get(0);
    assertThat(row.get("description")).isEqualTo("'  =1+1");
    assertThat(row.get("bank_account_name")).isEqualTo("'@malicious-bank");
    assertThat(transactions.findById(id).orElseThrow().getDescription()).isEqualTo("  =1+1");
  }

  @Test
  void unassignedEntriesRemainValidAndNewEndpointsRequireAuthentication() throws Exception {
    User u = owner("alice");
    String a = token(u);
    var tx = create(a, "Legacy compatible", "EXPENSE", "10.00", "USD", "2026-10-03", null, null);
    assertThat(tx.get("bankAccountId").isNull()).isTrue();
    assertThat(report(a, "").get(0).get("bank_account_name")).isEmpty();
    mvc.perform(get("/api/transactions/export")).andExpect(status().isUnauthorized());
    mvc.perform(
            put("/api/transactions/1/bank-account")
                .contentType("application/json")
                .content("{\"bankAccountId\":null}"))
        .andExpect(status().isUnauthorized());
  }
}
