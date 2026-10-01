package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.TransactionRepository;
import com.nayan.finance_tracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import java.util.Date;
import java.util.HexFormat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtAuthFilterTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Value("${application.security.jwt.secret}") String jwtSecret;

    @BeforeEach
    void cleanUp() {
        transactionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void malformedToken_returns401() throws Exception {
        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tamperedToken_returns401() throws Exception {
        createUser("owner@example.com");
        String token = loginAndGetToken("owner@example.com");

        // Change the first character of the signature (the part after the last dot)
        int sigStart = token.lastIndexOf('.') + 1;
        char replacement = token.charAt(sigStart) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, sigStart) + replacement + token.substring(sigStart + 1);

        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenForDeletedUser_returns401() throws Exception {
        User user = createUser("gone@example.com");
        String token = loginAndGetToken("gone@example.com");
        userRepository.delete(user);

        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_withStaleTokenInHeader_stillSucceeds() throws Exception {
        createUser("returning@example.com");

        mockMvc.perform(post("/api/auth/login")
                        .header("Authorization", "Bearer not-a-real-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"returning@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void expiredToken_returns401() throws Exception {
        createUser("expired@example.com");

        // A genuine token (correct secret) whose expiry time is one hour in the past
        long now = System.currentTimeMillis();
        String expiredToken = Jwts.builder()
                .setSubject("expired@example.com")
                .setIssuedAt(new Date(now - 2 * 60 * 60 * 1000))   // issued 2 hours ago
                .setExpiration(new Date(now - 60 * 60 * 1000))     // expired 1 hour ago
                .signWith(Keys.hmacShaKeyFor(HexFormat.of().parseHex(jwtSecret)), SignatureAlgorithm.HS256)
                .compact();

        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void noToken_returns401WithStandardBody() throws Exception {
        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication is required"))
                .andExpect(jsonPath("$.path").value("/api/transactions"));
    }

    @Test
    void errorPage_isNotBehindLogin() throws Exception {
        mockMvc.perform(get("/error"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    private User createUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .role(Role.USER)
                .build());
    }

    private String loginAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return body.split("\"token\":\"")[1].split("\"")[0];
    }
}