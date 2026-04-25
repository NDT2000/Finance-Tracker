package com.nayan.finance_tracker.controller;

import org.springframework.web.bind.annotation.RestController;

import com.nayan.finance_tracker.dto.BudgetDTO;
import com.nayan.finance_tracker.entity.Budget;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.BudgetService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;





@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {
    
    private final BudgetService budgetService;

    @PostMapping
    public ResponseEntity<Budget> create(
            @Valid @RequestBody BudgetDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(budgetService.create(dto, user));
    }
    
    @GetMapping
    public ResponseEntity<List<Budget>> getAll(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(budgetService.getAllForUser(user));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Budget> update(
            @PathVariable Long id, 
            @Valid @RequestBody BudgetDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(budgetService.update(id, dto, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        budgetService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

}
