package com.nayan.finance_tracker;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.repository.*;
import com.nayan.finance_tracker.security.*;
import com.nayan.finance_tracker.exception.GlobalExceptionHandler;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.*;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="application.security.cookie.secure=true")
@AutoConfigureMockMvc @ActiveProfiles("test") @ExtendWith(OutputCaptureExtension.class)
class SecurityRegressionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired TransactionRepository transactions;
    @Autowired BudgetRepository budgets;
    @Autowired AuthSessionRepository sessions;
    @Autowired RefreshCredentialRepository credentials;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtService jwt;
    private static final String PASSWORD="My long unique passphrase 42!";
    @BeforeEach @AfterEach void cleanup() {
        credentials.deleteAll(); sessions.deleteAll(); budgets.deleteAll(); transactions.deleteAll(); users.deleteAll();
    }
    User user(String email) {
        return users.save(User.builder().email(email).fullName("Test User").role(Role.USER).password(passwords.encode(PASSWORD)).build());
    }
    MockHttpServletRequestBuilder auth(String path) {
        return post(path).header("Origin","http://localhost").header("X-Requested-With","FinanceTracker").contentType(MediaType.APPLICATION_JSON);
    }
    MvcResult login(String email) throws Exception {
        return mvc.perform(auth("/api/auth/login").content(mapper.writeValueAsString(Map.of("email",email,"password",PASSWORD))))
            .andExpect(status().isOk()).andReturn();
    }
    String token(MvcResult result) throws Exception { return mapper.readTree(result.getResponse().getContentAsString()).get("token").asText(); }
    Cookie cookie(MvcResult result) {
        String value=result.getResponse().getHeader("Set-Cookie").split(";",2)[0].split("=",2)[1];
        return new Cookie("finance_refresh",value);
    }
    @Test void malformedExpiredTamperedAndMissingTokensReturn401() throws Exception {
        user("tokens@example.com"); String good=token(login("tokens@example.com"));
        String expired=Jwts.builder().subject("tokens@example.com").issuer("finance-tracker").expiration(Date.from(Instant.now().minusSeconds(10)))
            .signWith(Keys.hmacShaKeyFor(HexFormat.of().parseHex("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")),Jwts.SIG.HS256).compact();
        int index=good.lastIndexOf('.')+3;
        String tampered=good.substring(0,index)+(good.charAt(index)=='a'?'b':'a')+good.substring(index+1);
        for (String bad:List.of("not.a.token",expired,tampered,"")) {
            mvc.perform(get("/api/transactions").header("Authorization","Bearer "+bad))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid or expired access token"));
        }
        mvc.perform(get("/api/transactions")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }
    @Test void deletedUserAndUnboundTokenReturn401() throws Exception {
        User user=user("deleted@example.com"); String access=token(login(user.getEmail())); users.delete(user);
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        User other=user("unbound@example.com");
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+jwt.generateToken(other))).andExpect(status().isUnauthorized());
    }
    @Test void refreshRotatesCookieAndOldCookieRevokesEntireSession() throws Exception {
        user("rotate@example.com"); MvcResult initial=login("rotate@example.com");
        assertThat(initial.getResponse().getHeader("Set-Cookie")).contains("HttpOnly","Secure","SameSite=Strict","Path=/api/auth");
        MvcResult rotated=mvc.perform(auth("/api/auth/refresh").cookie(cookie(initial))).andExpect(status().isOk()).andReturn();
        assertThat(cookie(rotated).getValue()).isNotEqualTo(cookie(initial).getValue());
        assertThat(credentials.findAll()).allSatisfy(c -> assertThat(c.getTokenHash()).hasSize(64).doesNotContain(cookie(initial).getValue()));
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+token(rotated))).andExpect(status().isOk());
        mvc.perform(auth("/api/auth/refresh").cookie(cookie(initial))).andExpect(status().isUnauthorized());
        mvc.perform(auth("/api/auth/refresh").cookie(cookie(rotated))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+token(rotated))).andExpect(status().isUnauthorized());
    }
    @Test void logoutRevokesAccessAndRefreshAndClearsCookie() throws Exception {
        user("logout@example.com"); MvcResult initial=login("logout@example.com");
        mvc.perform(auth("/api/auth/logout").cookie(cookie(initial))).andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie",org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+token(initial))).andExpect(status().isUnauthorized());
        mvc.perform(auth("/api/auth/refresh").cookie(cookie(initial))).andExpect(status().isUnauthorized());
    }
    @Test void expiredRefreshAndMissingCookieReturn401() throws Exception {
        user("expired@example.com"); MvcResult initial=login("expired@example.com");
        AuthSession session=sessions.findAll().get(0); session.setExpiresAt(Instant.now().minusSeconds(1)); sessions.save(session);
        mvc.perform(auth("/api/auth/refresh").cookie(cookie(initial))).andExpect(status().isUnauthorized());
        mvc.perform(auth("/api/auth/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/transactions").cookie(cookie(initial))).andExpect(status().isUnauthorized());
    }
    @Test void cookieEndpointsRejectMissingOrUntrustedOriginAndMissingHeader() throws Exception {
        for (String path:List.of("login","register","refresh","logout")) {
            mvc.perform(post("/api/auth/"+path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
            mvc.perform(post("/api/auth/"+path).header("X-Requested-With","FinanceTracker").header("Origin","https://evil.example"))
                .andExpect(status().isForbidden());
            mvc.perform(post("/api/auth/"+path).header("Origin","http://localhost")).andExpect(status().isForbidden());
        }
    }
    @Test void validationDuplicateAndMalformedInputsHaveConsistentErrors() throws Exception {
        mvc.perform(auth("/api/auth/login").content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists()).andExpect(jsonPath("$.path").value("/api/auth/login"));
        mvc.perform(auth("/api/auth/login").content("{\"email\":\"invalid\",\"password\":\"x\"}")).andExpect(status().isBadRequest());
        mvc.perform(auth("/api/auth/login").content("{" )).andExpect(status().isBadRequest());
        user("duplicate@example.com");
        mvc.perform(auth("/api/auth/register").content(mapper.writeValueAsString(Map.of("fullName","User","email","duplicate@example.com","password",PASSWORD))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
    }
    @Test void registrationRejectsShortCommonAndUtf8OversizePasswords() throws Exception {
        for (String password:List.of("shortpass","password123456789","界".repeat(25))) {
            mvc.perform(auth("/api/auth/register").content(mapper.writeValueAsString(Map.of("fullName","User","email","new@example.com","password",password))))
                .andExpect(status().isBadRequest());
        }
        mvc.perform(auth("/api/auth/register").content(mapper.writeValueAsString(Map.of("fullName","User","email","new@example.com","password",PASSWORD))))
            .andExpect(status().isOk());
    }
    @Test void foreignAndMissingBudgetAndTransactionHaveSame404AndStayUnchanged() throws Exception {
        user("owner-a@example.com"); User b=user("owner-b@example.com"); String access=token(login("owner-a@example.com"));
        Budget budget=budgets.save(Budget.builder().user(b).category("Private").monthlyLimit(new BigDecimal("50")).month(1).year(2026).build());
        Transaction transaction=transactions.save(Transaction.builder().user(b).category("Private").description("Private")
            .amount(new BigDecimal("10")).type(TransactionType.EXPENSE).date(java.time.LocalDate.now()).build());
        for (long id: new long[]{budget.getId(),Long.MAX_VALUE}) {
            mvc.perform(delete("/api/budgets/"+id).header("Authorization","Bearer "+access)).andExpect(status().isNotFound());
            mvc.perform(put("/api/budgets/"+id).header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
                .content("{\"category\":\"Food\",\"monthlyLimit\":100,\"month\":1,\"year\":2026}")).andExpect(status().isNotFound());
        }
        for (long id: new long[]{transaction.getId(),Long.MAX_VALUE}) {
            mvc.perform(delete("/api/transactions/"+id).header("Authorization","Bearer "+access)).andExpect(status().isNotFound());
        }
        assertThat(budgets.findById(budget.getId()).orElseThrow().getMonthlyLimit()).isEqualByComparingTo("50");
        assertThat(transactions.findById(transaction.getId())).isPresent();
    }
    @Test void passwordChangeRevokesAllSessions() throws Exception {
        user("password@example.com"); var one=login("password@example.com"); var two=login("password@example.com");
        mvc.perform(auth("/api/auth/password").header("Authorization","Bearer "+token(one))
            .content(mapper.writeValueAsString(Map.of("currentPassword",PASSWORD,"newPassword","A different long passphrase 77!"))))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/transactions").header("Authorization","Bearer "+token(two))).andExpect(status().isUnauthorized());
        mvc.perform(auth("/api/auth/refresh").cookie(cookie(two))).andExpect(status().isUnauthorized());
        assertThat(passwords.matches("A different long passphrase 77!",users.findByEmail("password@example.com").orElseThrow().getPassword())).isTrue();
    }
    @Test void auditLogsExcludePersonalDataAndCredentials(CapturedOutput output) throws Exception {
        user("private-address@example.com"); login("private-address@example.com");
        mvc.perform(auth("/api/auth/login").content(mapper.writeValueAsString(Map.of("email","secret-address@example.com","password","wrong-secret"))))
            .andExpect(status().isUnauthorized());
        assertThat(output.getOut()).contains("security_event=login_success","security_event=login_failure")
            .doesNotContain("private-address@example.com","secret-address@example.com",PASSWORD,"wrong-secret");
    }
    @Test void simultaneousRefreshReuseFailsClosed() throws Exception {
        user("concurrent@example.com"); var initial=login("concurrent@example.com");
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        var ready=new java.util.concurrent.CountDownLatch(2);
        var start=new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.Callable<MvcResult> call=() -> {
            ready.countDown(); start.await();
            return mvc.perform(auth("/api/auth/refresh").cookie(cookie(initial))).andReturn();
        };
        try {
            var a=pool.submit(call); var b=pool.submit(call);
            assertThat(ready.await(5,java.util.concurrent.TimeUnit.SECONDS)).isTrue(); start.countDown();
            var one=a.get(10,java.util.concurrent.TimeUnit.SECONDS); var two=b.get(10,java.util.concurrent.TimeUnit.SECONDS);
            assertThat(List.of(one.getResponse().getStatus(),two.getResponse().getStatus())).containsExactlyInAnyOrder(200,401);
            assertThat(sessions.findAll()).allSatisfy(session -> assertThat(session.isRevoked()).isTrue());
        } finally { start.countDown(); pool.shutdownNow(); }
    }
    @Test void unexpectedErrorsNeverExposeInternalDetails() {
        var result=new GlobalExceptionHandler().unexpected(new RuntimeException("database-password-secret"),new ServletWebRequest(new MockHttpServletRequest()));
        assertThat(result.getStatusCode().value()).isEqualTo(500);
        assertThat(result.getBody().toString()).doesNotContain("database-password-secret").contains("An unexpected error occurred");
    }
}
