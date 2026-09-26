package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Budget;
import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.BudgetRepository;
import com.nayan.finance_tracker.repository.TransactionRepository;
import com.nayan.finance_tracker.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
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

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BudgetOwnershipTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    @AfterEach
    void cleanUp() {
        budgetRepository.deleteAll();
        transactionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void updateBudget_ownedByOtherUser_isRejected() throws Exception {
        User owner = createUser("owner@example.com");
        createUser("intruder@example.com");
        Budget budget = createBudget(owner);
        String intruderToken = loginAndGetToken("intruder@example.com");

        mockMvc.perform(put("/api/budgets/" + budget.getId())
                        .header("Authorization", "Bearer " + intruderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"Food\",\"monthlyLimit\":1,\"month\":1,\"year\":2026}"))
                .andExpect(status().isForbidden());

        // The owner's limit must be unchanged
        Budget after = budgetRepository.findById(budget.getId()).orElseThrow();
        assertThat(after.getMonthlyLimit()).isEqualByComparingTo("500");
    }

    @Test
    void deleteBudget_ownedByOtherUser_isRejected() throws Exception {
        User owner = createUser("owner@example.com");
        createUser("intruder@example.com");
        Budget budget = createBudget(owner);
        String intruderToken = loginAndGetToken("intruder@example.com");

        mockMvc.perform(delete("/api/budgets/" + budget.getId())
                        .header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isForbidden());

        // The owner's budget must still exist
        assertThat(budgetRepository.findById(budget.getId())).isPresent();
    }

    @Test
    void listBudgets_returnsOnlyOwnData() throws Exception {
        User owner = createUser("owner@example.com");
        User other = createUser("other@example.com");
        createBudget(owner);
        createBudget(other);
        String ownerToken = loginAndGetToken("owner@example.com");

        mockMvc.perform(get("/api/budgets")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    private User createUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .role(Role.USER)
                .build());
    }

    private Budget createBudget(User user) {
        return budgetRepository.save(Budget.builder()
                .user(user)
                .category("Food")
                .monthlyLimit(new BigDecimal("500"))
                .month(1)
                .year(2026)
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