package com.nayan.finance_tracker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="application.security.cookie.secure=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired FinancialAccountRepository accounts;
    @Autowired TransactionRepository transactions;
    @Autowired BudgetRepository budgets;
    @Autowired AuthSessionRepository sessions;
    @Autowired RefreshCredentialRepository credentials;
    @Autowired PasswordEncoder passwords;
    private static final String PASSWORD = "A unique profile test passphrase 42!";

    @BeforeEach @AfterEach void cleanup() {
        credentials.deleteAll(); sessions.deleteAll(); accounts.deleteAll();
        budgets.deleteAll(); transactions.deleteAll(); users.deleteAll();
    }
    User user(String email, String name) {
        return users.save(User.builder().email(email).fullName(name).role(Role.USER)
            .password(passwords.encode(PASSWORD)).build());
    }
    MvcResult login(String email) throws Exception {
        return mvc.perform(post("/api/auth/login").header("Origin","http://localhost")
            .header("X-Requested-With","FinanceTracker").contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("email",email,"password",PASSWORD))))
            .andExpect(status().isOk()).andReturn();
    }
    String token(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
    @Test void profileRequiresBearerAuthentication() throws Exception {
        mvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"Someone\"}"))
            .andExpect(status().isUnauthorized());
    }
    @Test void profileReturnsOnlyAuthenticatedUsersNameAndEmail() throws Exception {
        user("alice@example.com","Alice"); user("bob@example.com","Bob");
        String access=token(login("alice@example.com"));
        mvc.perform(get("/api/profile").header("Authorization","Bearer "+access))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"fullName\":\"Alice\",\"email\":\"alice@example.com\"}",true))
            .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.role").doesNotExist());
    }
    @Test void updateChangesOnlyOwnNameAndRefreshUsesUpdatedName() throws Exception {
        User alice=user("alice@example.com","Alice"); User bob=user("bob@example.com","Bob");
        MvcResult signedIn=login("alice@example.com"); String access=token(signedIn);
        mvc.perform(put("/api/profile").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("fullName","  Alice Updated  ","email",bob.getEmail(),
                "id",bob.getId(),"role","ADMIN","password","an injected password"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Alice Updated"))
            .andExpect(jsonPath("$.email").value("alice@example.com"));
        User updated=users.findById(alice.getId()).orElseThrow();
        assertThat(updated.getRole()).isEqualTo(Role.USER);
        assertThat(passwords.matches(PASSWORD,updated.getPassword())).isTrue();
        assertThat(users.findById(bob.getId()).orElseThrow().getFullName()).isEqualTo("Bob");
        mvc.perform(get("/api/profile").header("Authorization","Bearer "+access))
            .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Alice Updated"));
        String refresh=signedIn.getResponse().getHeader("Set-Cookie").split(";",2)[0].split("=",2)[1];
        mvc.perform(post("/api/auth/refresh").header("Origin","http://localhost")
            .header("X-Requested-With","FinanceTracker").cookie(new jakarta.servlet.http.Cookie("finance_refresh",refresh)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Alice Updated"));
    }
    @Test void invalidNamesLeaveStoredProfileUnchanged() throws Exception {
        User alice=user("alice@example.com","Alice"); String access=token(login(alice.getEmail()));
        for (String name : new String[]{"   ","x".repeat(101)}) {
            mvc.perform(put("/api/profile").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("fullName",name))))
                .andExpect(status().isBadRequest());
        }
        assertThat(users.findById(alice.getId()).orElseThrow().getFullName()).isEqualTo("Alice");
    }
    @Test void wrongCurrentPasswordDoesNotChangePasswordOrRevokeSession() throws Exception {
        User alice=user("alice@example.com","Alice"); String access=token(login(alice.getEmail()));
        mvc.perform(post("/api/auth/password").header("Authorization","Bearer "+access)
            .header("Origin","http://localhost").header("X-Requested-With","FinanceTracker")
            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of(
                "currentPassword","incorrect","newPassword","Another unique long passphrase 77!"))))
            .andExpect(status().isUnauthorized());
        assertThat(passwords.matches(PASSWORD,users.findById(alice.getId()).orElseThrow().getPassword())).isTrue();
        mvc.perform(get("/api/profile").header("Authorization","Bearer "+access)).andExpect(status().isOk());
    }
}
