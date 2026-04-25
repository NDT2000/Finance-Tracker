package com.nayan.finance_tracker.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nayan.finance_tracker.dto.TransactionDTO;
import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

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
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<Transaction> create(
        @Valid @RequestBody TransactionDTO dto,
        @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(transactionService.create(dto, user));

    }
    
    @GetMapping
    public ResponseEntity<List<Transaction>> getAll(
        @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(transactionService.getAllForUser(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> update(
        @PathVariable Long id,
        @Valid @RequestBody TransactionDTO dto,
        @AuthenticationPrincipal User user) {
        
        return ResponseEntity.ok(transactionService.update(id, dto, user));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal User user) {
        
        transactionService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
    
}
