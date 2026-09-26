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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtAuthFilterTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;

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