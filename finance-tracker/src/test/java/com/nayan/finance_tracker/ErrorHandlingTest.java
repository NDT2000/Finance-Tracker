package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.BudgetRepository;
import com.nayan.finance_tracker.repository.TransactionRepository;
import com.nayan.finance_tracker.repository.UserRepository;
import com.nayan.finance_tracker.service.TransactionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ErrorHandlingTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;

    // Replaces the real TransactionService with a fake we control
    @MockBean TransactionService transactionService;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        cleanUp();
        userRepository.save(User.builder()
                .email("errors@example.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .role(Role.USER)
                .build());
        token = loginAndGetToken("errors@example.com");
    }

    @AfterEach
    void cleanUp() {
        budgetRepository.deleteAll();
        transactionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void unexpectedError_returnsSafe500() throws Exception {
        when(transactionService.getAllForUser(any()))
                .thenThrow(new RuntimeException("SQL failed on table users"));

        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(content().string(not(containsString("SQL"))));
    }

    @Test
    void malformedJson_stillReturns400() throws Exception {
        mockMvc.perform(post("/api/budgets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\": "))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonNumericId_stillReturns400() throws Exception {
        mockMvc.perform(delete("/api/budgets/abc")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void wrongHttpMethod_stillReturns405() throws Exception {
        mockMvc.perform(patch("/api/budgets/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed());
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