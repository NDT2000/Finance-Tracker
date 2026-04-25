package com.nayan.finance_tracker.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.nayan.finance_tracker.dto.BudgetDTO;
import com.nayan.finance_tracker.entity.Budget;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.BudgetRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetService {

    final private BudgetRepository budgetRepository;

    public Budget create(BudgetDTO dto, User user) {
        // Check if budget already exists for this category/month/year
        budgetRepository.findByUserAndCategoryAndMonthAndYear(user, dto.getCategory(), dto.getMonth(), dto.getYear())
            .ifPresent(b -> {
                throw new RuntimeException(
                    "Budget already exists for category " + dto.getCategory() + " in " + dto.getMonth() + "/" + dto.getYear());
            });
        
        Budget budget = Budget.builder()
            .category(dto.getCategory())
            .monthlyLimit(dto.getMonthlyLimit())
            .month(dto.getMonth())
            .year(dto.getYear())
            .user(user)
            .build();
        
        Budget saved = budgetRepository.save(budget);
        log.info("Budget created for user {}:{} - {}/{}",
            user.getEmail(), dto.getCategory(),
            dto.getMonth(), dto.getYear());
        
        return saved;
    }

    public List<Budget> getAllForUser(User user) {
        return budgetRepository.findByUser(user);
    }

    public Budget update(Long id, BudgetDTO dto, User user) {
        Budget budget = budgetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Budget not found"));
        
        if(!budget.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        budget.setMonthlyLimit(dto.getMonthlyLimit());
        return budgetRepository.save(budget);

    }

    public void delete(Long id, User user) {
        Budget budget = budgetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Budget not found"));
        
        if(!budget.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        budgetRepository.delete(budget);
        log.info("Budget {} deleted by {}", id, user.getEmail());
    }
    
}
