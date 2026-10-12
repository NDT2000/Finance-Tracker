package com.nayan.finance_tracker;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.nayan.finance_tracker.dto.TransactionDTO;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.pipeline.*;
import com.nayan.finance_tracker.repository.*;
import com.nayan.finance_tracker.service.TransactionService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class BatchPipelineTest {
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

  @Autowired BatchService batches;
  @Autowired BatchWorker worker;
  @Autowired BatchProcessor processor;
  @Autowired AnalyticsService analytics;
  @Autowired TransactionService ledger;
  @Autowired TransactionRepository transactions;
  @Autowired UserRepository users;
  @Autowired PasswordEncoder passwords;
  @Autowired JdbcTemplate db;
  @Autowired MockMvc mvc;
  @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
  @SpyBean CsvRows csv;

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

  User owner(String prefix) {
    return users.save(
        User.builder()
            .email(prefix + "@example.com")
            .fullName("Pipeline User")
            .password(passwords.encode("A unique long demo passphrase 42!"))
            .role(Role.USER)
            .build());
  }

  byte[] sample(String name) throws Exception {
    return Files.readAllBytes(Path.of("../pipeline/data/product/" + name));
  }

  UUID upload(User owner, byte[] bytes) {
    return (UUID) batches.upload(owner.getId(), "checking", "expenses.csv", bytes).get("id");
  }

  byte[] simple(String rows) {
    return ("date,category,description,amount,currency,type,source_transaction_id,revision,refund_of\n"
            + rows)
        .getBytes(StandardCharsets.UTF_8);
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
                            Map.of(
                                "email",
                                user.getEmail(),
                                "password",
                                "A unique long demo passphrase 42!"))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  @Test
  void handReconciledSampleLinksManualEntryCorrectsRefundsAndKeepsCurrenciesSeparate()
      throws Exception {
    User owner = owner("sample");
    var dto = new TransactionDTO();
    dto.setDate(LocalDate.of(2026, 10, 3));
    dto.setCategory("Food");
    dto.setDescription("Coffee");
    dto.setAmount(new BigDecimal("10.00"));
    dto.setType(TransactionType.EXPENSE);
    var coffee = ledger.create(dto, owner);
    UUID initial = upload(owner, sample("01-expenses.csv"));
    assertThat(worker.runOnce()).isTrue();
    assertThat(batches.owned(initial, owner.getId()).get("status")).isEqualTo("NEEDS_REVIEW");
    assertThat(batches.rows(initial, owner.getId(), 0, true)).hasSize(1);
    assertThat(batches.source(initial, owner.getId())).isEqualTo(sample("01-expenses.csv"));
    processor.review(initial, 1, owner.getId(), "LINK", coffee.getId());
    UUID correction = upload(owner, sample("02-corrections.csv"));
    worker.runOnce();
    var usd = analytics.summary(owner.getId(), YearMonth.of(2026, 10), "USD");
    assertThat(new BigDecimal((String) usd.get("grossExpenses"))).isEqualByComparingTo("50.00");
    assertThat(new BigDecimal((String) usd.get("refunds"))).isEqualByComparingTo("10.00");
    assertThat(new BigDecimal((String) usd.get("netExpenses"))).isEqualByComparingTo("40.00");
    assertThat(new BigDecimal((String) usd.get("income"))).isEqualByComparingTo("100.00");
    assertThat(new BigDecimal((String) usd.get("netSavings"))).isEqualByComparingTo("60.00");
    assertThat(usd.get("transactionCount")).isEqualTo(5);
    assertThat(
            new BigDecimal(
                (String)
                    analytics
                        .summary(owner.getId(), YearMonth.of(2026, 10), "EUR")
                        .get("netExpenses")))
        .isEqualByComparingTo("7.50");
    assertThat(
            analytics.summary(owner.getId(), YearMonth.of(2026, 11), "USD").get("transactionCount"))
        .isEqualTo(0);
    assertThat(upload(owner, sample("02-corrections.csv"))).isEqualTo(correction);
    assertThat(worker.runOnce()).isFalse();
    UUID overlap =
        upload(owner, simple("2026-10-05,Food,Groceries,35.00,USD,EXPENSE,groceries-1,2,\n"));
    worker.runOnce();
    assertThat(batches.rows(overlap, owner.getId(), 0, false).get(0).get("status"))
        .isEqualTo("DUPLICATE");
    assertThat(transactions.findByUserAndDeletedFalse(owner)).hasSize(6);
  }

  @Test
  void concurrentUploadsAndWorkersDoNotDuplicateTransactions() throws Exception {
    User user = owner("concurrent");
    byte[] bytes = simple("2026-10-01,Food,One,1.00,USD,EXPENSE,one,1,\n");
    var pool = Executors.newFixedThreadPool(4);
    try {
      var results = new ArrayList<Future<UUID>>();
      for (int i = 0; i < 8; i++) results.add(pool.submit(() -> upload(user, bytes)));
      Set<UUID> ids = new HashSet<>();
      for (var future : results) ids.add(future.get(10, TimeUnit.SECONDS));
      assertThat(ids).hasSize(1);
      var a = pool.submit(worker::runOnce);
      var b = pool.submit(worker::runOnce);
      a.get(10, TimeUnit.SECONDS);
      b.get(10, TimeUnit.SECONDS);
      assertThat(transactions.findByUserAndDeletedFalse(user)).hasSize(1);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void injectedMidBatchFailureRollsBackAndRecoversFromOriginalBytes() {
    User user = owner("retry");
    UUID id =
        upload(
            user,
            simple(
                "2026-10-01,Food,One,1.00,USD,EXPENSE,one,1,\n"
                    + "2026-10-02,Food,Two,2.00,USD,EXPENSE,two,1,\n"));
    AtomicInteger calls = new AtomicInteger();
    doAnswer(
            invocation -> {
              if (calls.incrementAndGet() == 2) throw new IllegalStateException("injected failure");
              return invocation.callRealMethod();
            })
        .when(csv)
        .value(any());
    worker.runOnce();
    assertThat(transactions.findByUserAndDeletedFalse(user)).isEmpty();
    assertThat(batches.rows(id, user.getId(), 0, false)).isEmpty();
    assertThat(batches.owned(id, user.getId()).get("status")).isEqualTo("QUEUED");
    reset(csv);
    db.update("update import_batches set next_attempt_at=now() where id=?", id);
    worker.runOnce();
    assertThat(transactions.findByUserAndDeletedFalse(user)).hasSize(2);
    assertThat(batches.owned(id, user.getId()).get("attempts")).isEqualTo(2);
  }

  @Test
  void expiredLeaseRecoversAndExhaustionAllowsExplicitRetry() {
    User user = owner("lease");
    UUID id = upload(user, simple("2026-10-01,Food,One,1.00,USD,EXPENSE,one,1,\n"));
    UUID stale = UUID.randomUUID();
    db.update(
        "update import_batches set status='PROCESSING',claim_token=?,lease_until=now()-interval '1"
            + " minute',attempts=3 where id=?",
        stale,
        id);
    assertThat(worker.runOnce()).isFalse();
    assertThat(batches.owned(id, user.getId()).get("status")).isEqualTo("FAILED");
    batches.retry(id, user.getId());
    worker.runOnce();
    processor.process(id, stale);
    assertThat(transactions.findByUserAndDeletedFalse(user)).hasSize(1);
    assertThat(batches.owned(id, user.getId()).get("status")).isEqualTo("COMPLETED");
  }

  @Test
  void invalidMinorUnitsIdentityConflictAndRefundLimitsNeverMutateCanonicalValues() {
    User user = owner("validation");
    UUID id =
        upload(
            user,
            simple(
                "2026-10-01,Food,Expense,10.00,USD,EXPENSE,e,1,\n"
                    + "2026-10-02,Food,Bad,1.001,USD,EXPENSE,bad,1,\n"
                    + "2026-10-03,Food,Too much,11.00,USD,REFUND,r,1,e\n"));
    worker.runOnce();
    assertThat(batches.rows(id, user.getId(), 0, true)).hasSize(2);
    UUID conflict = upload(user, simple("2026-10-01,Food,Expense,20.00,USD,EXPENSE,e,1,\n"));
    worker.runOnce();
    assertThat(batches.rows(conflict, user.getId(), 0, true)).hasSize(1);
    assertThat(transactions.findByUserAndDeletedFalse(user).get(0).getAmount())
        .isEqualByComparingTo("10.00");
    UUID malformed = upload(user, "wrong,header\n1,2\n".getBytes(StandardCharsets.UTF_8));
    worker.runOnce();
    assertThat(batches.owned(malformed, user.getId()).get("status")).isEqualTo("FAILED");
  }

  @Test
  void missingIdentitiesRequireReviewAndRefundDependenciesCanBeReevaluated() {
    User user = owner("dependencies");
    UUID missing =
        upload(
            user,
            "date,category,description,amount,currency\n2026-10-01,Food,Unidentified,1.00,USD\n"
                .getBytes(StandardCharsets.UTF_8));
    worker.runOnce();
    assertThat(transactions.findByUserAndDeletedFalse(user)).isEmpty();
    processor.review(missing, 1, user.getId(), "KEEP_BOTH", null);
    assertThat(transactions.findByUserAndDeletedFalse(user)).hasSize(1);
    UUID refund = upload(user, simple("2026-10-03,Food,Return,2.00,USD,REFUND,r,1,p\n"));
    worker.runOnce();
    assertThat(batches.rows(refund, user.getId(), 0, true)).hasSize(1);
    upload(user, simple("2026-10-02,Food,Purchase,5.00,USD,EXPENSE,p,1,\n"));
    worker.runOnce();
    batches.retry(refund, user.getId());
    worker.runOnce();
    assertThat(batches.rows(refund, user.getId(), 0, true)).isEmpty();
    UUID self = upload(user, simple("2026-10-02,Food,Purchase,5.00,USD,REFUND,p,2,p\n"));
    worker.runOnce();
    assertThat(batches.rows(self, user.getId(), 0, true)).hasSize(1);
    assertThat(
            transactions.findByUserAndDeletedFalse(user).stream()
                .filter(t -> "p".equals(t.getSourceRecordId()))
                .findFirst()
                .orElseThrow()
                .getType())
        .isEqualTo(TransactionType.EXPENSE);
  }

  @Test
  void exclusionsRemainExcludedOnRerunAndCurrencyMinorUnitsAreExact() {
    User user = owner("excluded");
    byte[] bytes = simple("2026-10-01,Food,Yen,100,JPY,EXPENSE,jpy,1,\n");
    UUID id = upload(user, bytes);
    worker.runOnce();
    var t = transactions.findByUserAndDeletedFalse(user).get(0);
    ledger.delete(t.getId(), user);
    batches.retry(id, user.getId());
    worker.runOnce();
    assertThat(transactions.findByUserAndDeletedFalse(user)).isEmpty();
    ledger.restore(t.getId(), user);
    assertThat(
            new BigDecimal(
                (String)
                    analytics
                        .summary(user.getId(), YearMonth.of(2026, 10), "JPY")
                        .get("netExpenses")))
        .isEqualByComparingTo("100");
  }

  @Test
  void authenticatedUploadHistoryReportsAndAnalyticsAreOwnerScoped() throws Exception {
    User owner = owner("http-owner"), other = owner("http-other");
    String access = token(owner), foreign = token(other);
    byte[] bytes = simple("2026-10-01,Food,One,1.00,USD,EXPENSE,one,1,\n");
    mvc.perform(
            multipart("/api/imports")
                .file(new MockMultipartFile("file", "expense.csv", "text/csv", bytes)))
        .andExpect(status().isUnauthorized());
    var result =
        mvc.perform(
                multipart("/api/imports")
                    .file(new MockMultipartFile("file", "expense.csv", "text/csv", bytes))
                    .param("accountRef", "checking")
                    .header("Authorization", "Bearer " + access))
            .andExpect(status().isAccepted())
            .andReturn();
    String id = json.readTree(result.getResponse().getContentAsString()).get("id").asText();
    worker.runOnce();
    for (String suffix : List.of("", "/rows", "/source"))
      mvc.perform(get("/api/imports/" + id + suffix).header("Authorization", "Bearer " + foreign))
          .andExpect(status().isNotFound());
    mvc.perform(post("/api/imports/" + id + "/retry").header("Authorization", "Bearer " + foreign))
        .andExpect(status().isNotFound());
    mvc.perform(
            get("/api/analytics/monthly?month=2026-10&currency=USD")
                .header("Authorization", "Bearer " + foreign))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.transactionCount").value(0));
    mvc.perform(get("/api/imports/" + id + "/source").header("Authorization", "Bearer " + access))
        .andExpect(status().isOk())
        .andExpect(content().bytes(bytes));
  }
}
