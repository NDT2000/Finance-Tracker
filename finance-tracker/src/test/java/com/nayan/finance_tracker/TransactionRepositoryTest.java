package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.TransactionType;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class TransactionRepositoryTest {

    @Autowired TransactionRepository transactionRepository;
    @Autowired TestEntityManager em;

    // helper: create + persist a user
    private User persistUser(String email) {
        return em.persist(User.builder()
                .email(email)
                .password("hashed")
                .fullName("Test User")
                .role(Role.USER)          // VERIFY: your Role enum + value
                .build());
    }

    // helper: create + persist a transaction
    private void persistTxn(User user, String category, TransactionType type,
                            String amount, LocalDate date) {
        em.persist(Transaction.builder()
                .user(user)
                .category(category)
                .type(type)
                .amount(new BigDecimal(amount))
                .description("test txn")
                .date(date)
                .build());
    }

    @Test
    void forecastQuery_returnsOnlyExpenses_excludesIncome() {
        User user = persistUser("a@example.com");
        LocalDate today = LocalDate.now();

        persistTxn(user, "Food", TransactionType.EXPENSE, "50", today);
        persistTxn(user, "Food", TransactionType.INCOME, "500", today);  // must be excluded

        LocalDate start = today.withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Transaction> result = transactionRepository
                .findByUserAndCategoryAndTypeAndDateBetween(
                        user, "Food", TransactionType.EXPENSE, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(TransactionType.EXPENSE);
    }

    @Test
    void forecastQuery_returnsOnlyCurrentMonth() {
        User user = persistUser("a@example.com");
        LocalDate today = LocalDate.now();
        LocalDate lastMonth = today.minusMonths(1);

        persistTxn(user, "Food", TransactionType.EXPENSE, "50", today);
        persistTxn(user, "Food", TransactionType.EXPENSE, "80", lastMonth);  // excluded

        LocalDate start = today.withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Transaction> result = transactionRepository
                .findByUserAndCategoryAndTypeAndDateBetween(
                        user, "Food", TransactionType.EXPENSE, start, end);

        assertThat(result).hasSize(1);
    }

    @Test
    void forecastQuery_returnsOnlySpecifiedCategory() {
        User user = persistUser("a@example.com");
        LocalDate today = LocalDate.now();

        persistTxn(user, "Food", TransactionType.EXPENSE, "50", today);
        persistTxn(user, "Travel", TransactionType.EXPENSE, "200", today);  // excluded

        LocalDate start = today.withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Transaction> result = transactionRepository
                .findByUserAndCategoryAndTypeAndDateBetween(
                        user, "Food", TransactionType.EXPENSE, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCategory()).isEqualTo("Food");
    }

    @Test
    void forecastQuery_returnsOnlyOwnUsersData() {
        User userA = persistUser("a@example.com");
        User userB = persistUser("b@example.com");
        LocalDate today = LocalDate.now();

        persistTxn(userA, "Food", TransactionType.EXPENSE, "50", today);
        persistTxn(userB, "Food", TransactionType.EXPENSE, "999", today);  // excluded

        LocalDate start = today.withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Transaction> result = transactionRepository
                .findByUserAndCategoryAndTypeAndDateBetween(
                        userA, "Food", TransactionType.EXPENSE, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUser().getEmail()).isEqualTo("a@example.com");
    }

    @Test
    void forecastQuery_withNoExpenses_returnsEmpty() {
        User user = persistUser("a@example.com");
        LocalDate today = LocalDate.now();

        persistTxn(user, "Food", TransactionType.INCOME, "500", today);  // only income

        LocalDate start = today.withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Transaction> result = transactionRepository
                .findByUserAndCategoryAndTypeAndDateBetween(
                        user, "Food", TransactionType.EXPENSE, start, end);

        assertThat(result).isEmpty();
    }
}
