package com.nayan.finance_tracker.repository;

import java.util.List;

import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    List<Transaction> findByUserId(User user);

    List<Transaction> findByUserAndCategory(User user, String category);

}
