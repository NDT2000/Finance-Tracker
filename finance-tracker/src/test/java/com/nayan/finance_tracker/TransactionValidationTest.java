package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
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
class TransactionValidationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        userRepository.save(User.builder()
                .email("a@example.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .role(Role.USER)
                .build());
    }

    private String token() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@example.com\",\"password\":\"password123\"}"))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return body.split("\"token\":\"")[1].split("\"")[0];
    }

    @Test
    void createTransaction_withValidData_succeeds() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"lunch\",\"amount\":50,\"type\":\"EXPENSE\",\"category\":\"Food\",\"date\":\"2026-07-22\"}"))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void createTransaction_withEmptyDescription_returns400() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"\",\"amount\":50,\"type\":\"EXPENSE\",\"category\":\"Food\",\"date\":\"2026-07-22\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createTransaction_withNullAmount_returns400() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"lunch\",\"type\":\"EXPENSE\",\"category\":\"Food\",\"date\":\"2026-07-22\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createTransaction_withInvalidType_returns400() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"lunch\",\"amount\":50,\"type\":\"BANANA\",\"category\":\"Food\",\"date\":\"2026-07-22\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createTransaction_withMissingCategory_returns400() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"lunch\",\"amount\":50,\"type\":\"EXPENSE\",\"date\":\"2026-07-22\"}"))
                .andExpect(status().isBadRequest());
    }
}
