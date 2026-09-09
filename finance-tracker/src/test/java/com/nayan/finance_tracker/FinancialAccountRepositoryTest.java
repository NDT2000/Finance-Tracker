package com.nayan.finance_tracker;

import com.nayan.finance_tracker.entity.AccountStatus;
import com.nayan.finance_tracker.entity.AccountType;
import com.nayan.finance_tracker.entity.FinancialAccount;
import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.FinancialAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class FinancialAccountRepositoryTest {

    @Autowired
    private FinancialAccountRepository accountRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByIdAndUser_returnsAccountForOwner() {
        User owner = persistUser("owner@example.com");
        FinancialAccount account = persistAccount(owner, "Main Checking");

        var result = accountRepository.findByIdAndUser(
            account.getId(),
            owner
        );

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Main Checking");
    }

    @Test
    void findByIdAndUser_doesNotReturnAnotherUsersAccount() {
        User owner = persistUser("owner@example.com");
        User anotherUser = persistUser("another@example.com");

        FinancialAccount account = persistAccount(
            owner,
            "Main Checking"
        );

        var result = accountRepository.findByIdAndUser(
            account.getId(),
            anotherUser
        );

        assertThat(result).isEmpty();
    }

    private User persistUser(String email) {
        return entityManager.persist(
            User.builder()
                .email(email)
                .password("hashed-password")
                .fullName("Test User")
                .role(Role.USER)
                .build()
        );
    }

    private FinancialAccount persistAccount(
        User user,
        String name
    ) {
        FinancialAccount account = FinancialAccount.builder()
            .user(user)
            .name(name)
            .type(AccountType.CHECKING)
            .currency("USD")
            .status(AccountStatus.ACTIVE)
            .balance(BigDecimal.ZERO)
            .build();

        return entityManager.persistAndFlush(account);
    }
}