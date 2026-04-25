package com.nayan.finance_tracker.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nayan.finance_tracker.entity.Budget;
import com.nayan.finance_tracker.entity.User;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUser(User user);

    Optional<Budget> findByUserAndCategoryAndMonthAndYear(User user, String category, int month, int year);
    
}
