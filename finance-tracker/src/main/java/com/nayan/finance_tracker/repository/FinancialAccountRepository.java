package com.nayan.finance_tracker.repository;

import com.nayan.finance_tracker.entity.FinancialAccount;
import com.nayan.finance_tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialAccountRepository
        extends JpaRepository<FinancialAccount, Long> {

    List<FinancialAccount> findByUserOrderByCreatedAtAsc(User user);

    Optional<FinancialAccount> findByIdAndUser(
        Long id,
        User user
    );

    Optional<FinancialAccount> findByUserAndNameIgnoreCase(
        User user,
        String name
    );
}