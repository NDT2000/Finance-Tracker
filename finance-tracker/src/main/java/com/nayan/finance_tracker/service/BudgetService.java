package com.nayan.finance_tracker.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.nayan.finance_tracker.dto.BudgetDTO;
import com.nayan.finance_tracker.entity.Budget;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.exception.DuplicateResourceException;
import com.nayan.finance_tracker.repository.BudgetRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetService {

    final private BudgetRepository budgetRepository;
    private final com.nayan.finance_tracker.pipeline.CurrencyRules money;

    public Budget create(BudgetDTO dto, User user) {
        // Check if budget already exists for this category/month/year
        budgetRepository.findByUserAndCategoryAndMonthAndYearAndCurrency(user, dto.getCategory(), dto.getMonth(), dto.getYear(), money.code(dto.getCurrency()))
            .ifPresent(b -> {
                throw new DuplicateResourceException(
                    "Budget already exists for category " + dto.getCategory() + " in " + dto.getMonth() + "/" + dto.getYear());
            });
        
        Budget budget = Budget.builder()
            .category(dto.getCategory())
            .monthlyLimit(money.amount(dto.getMonthlyLimit(),dto.getCurrency()))
            .currency(dto.getCurrency())
            .month(dto.getMonth())
            .year(dto.getYear())
            .user(user)
            .build();
        
        Budget saved = budgetRepository.save(budget);
        log.info("Budget created user_id={} budget_id={}", user.getId(), saved.getId());
        
        return saved;
    }

    public List<Budget> getAllForUser(User user) {
        return budgetRepository.findByUser(user);
    }

    public Budget update(Long id, BudgetDTO dto, User user) {
        Budget budget = budgetRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new com.nayan.finance_tracker.exception.ResourceNotFoundException("Budget not found"));

        budget.setMonthlyLimit(money.amount(dto.getMonthlyLimit(),budget.getCurrency()));
        return budgetRepository.save(budget);

    }

    public void delete(Long id, User user) {
        Budget budget = budgetRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new com.nayan.finance_tracker.exception.ResourceNotFoundException("Budget not found"));

        budgetRepository.delete(budget);
        log.info("Budget {} deleted by {}", id, user.getId());
    }
    
}
