package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.TransactionType;
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

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TransactionOwnershipTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanUp() {
        transactionRepository.deleteAll();
        userRepository.deleteAll();
    }

    private User createUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .role(Role.USER)
                .build());
    }

    private Transaction createTxn(User user) {
        return transactionRepository.save(Transaction.builder()
                .user(user)
                .category("Food")
                .type(TransactionType.EXPENSE)
                .amount(new BigDecimal("50"))
                .description("test")
                .date(LocalDate.now())
                .build());
    }

    // logs in and extracts the token from the response
    private String loginAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        // crude token extraction — assumes {"token":"..."}
        return body.split("\"token\":\"")[1].split("\"")[0];
    }

    @Test
    void getTransaction_ownedByOtherUser_isRejected() throws Exception {
        User userA = createUser("a@example.com");
        User userB = createUser("b@example.com");
        Transaction bsTxn = createTxn(userB);

        String tokenA = loginAndGetToken("a@example.com");

        // VERIFY endpoint path: is it /api/transactions/{id} ?
        mockMvc.perform(get("/api/transactions/" + bsTxn.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().is4xxClientError());  // must NOT return B's data
    }

    @Test
    void deleteTransaction_ownedByOtherUser_isRejected() throws Exception {
        User userA = createUser("a@example.com");
        User userB = createUser("b@example.com");
        Transaction bsTxn = createTxn(userB);

        String tokenA = loginAndGetToken("a@example.com");

        mockMvc.perform(delete("/api/transactions/" + bsTxn.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().is4xxClientError());

        // B's transaction should still exist
        assertThat(transactionRepository.findById(bsTxn.getId())).isPresent();
    }

    @Test
    void listTransactions_returnsOnlyOwnData() throws Exception {
        User userA = createUser("a@example.com");
        User userB = createUser("b@example.com");
        createTxn(userA);
        createTxn(userA);
        createTxn(userB);   // B's — must not appear in A's list

        String tokenA = loginAndGetToken("a@example.com");

        // VERIFY endpoint path + that response is a JSON array
        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));  // only A's two
    }

    @Test
    void accessingEndpoint_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().is4xxClientError());  // 401/403 with no token
    }
}
