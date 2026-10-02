package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.dto.TransactionDTO;
import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.exception.ResourceNotFoundException;
import com.nayan.finance_tracker.exception.UnauthorizedAccessException;
import com.nayan.finance_tracker.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    
    public Transaction create(TransactionDTO dto, User user) {
        Transaction transaction = Transaction.builder()
                .description(dto.getDescription())
                .amount(dto.getAmount())
                .type(dto.getType())
                .category(dto.getCategory())
                .date(dto.getDate())
                .user(user)
                .build();

        Transaction saved = transactionRepository.save(transaction);
        log.info("Transaction {} created for user {}", saved.getId(), user.getId());
        return saved;
        
    }

    public List<Transaction> getAllForUser(User user) {
        return transactionRepository.findByUser(user);
    }

    public Transaction update(Long id, TransactionDTO dto, User user) {
        // Only finds the transaction if it belongs to this user
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        transaction.setDescription(dto.getDescription());
        transaction.setAmount(dto.getAmount());
        transaction.setType(dto.getType());
        transaction.setCategory(dto.getCategory());
        transaction.setDate(dto.getDate());

        return transactionRepository.save(transaction);
    }

    public void delete(Long id, User user) {
        // Only finds the transaction if it belongs to this user
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        transactionRepository.delete(transaction);
        log.info("Transaction {} deleted by user {}", id, user.getId());
    }
}
