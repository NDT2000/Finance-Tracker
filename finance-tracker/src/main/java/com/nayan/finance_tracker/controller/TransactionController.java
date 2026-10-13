package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.dto.TransactionDTO;
import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.TransactionService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

  private final TransactionService transactionService;
  private final com.nayan.finance_tracker.service.TransactionExportService exports;

  @PostMapping
  public ResponseEntity<Transaction> create(
      @Valid @RequestBody TransactionDTO dto, @AuthenticationPrincipal User user) {

    return ResponseEntity.ok(transactionService.create(dto, user));
  }

  @GetMapping
  public ResponseEntity<List<Transaction>> getAll(
      @RequestParam(required = false) String month,
      @RequestParam(required = false) String currency,
      @AuthenticationPrincipal User user) {

    return ResponseEntity.ok(
        month == null && currency == null
            ? transactionService.getAllForUser(user)
            : transactionService.forPeriod(user, month, currency == null ? "USD" : currency));
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      @RequestParam(required = false) String month,
      @RequestParam(required = false) String currency,
      @RequestParam(required = false) com.nayan.finance_tracker.entity.TransactionType type,
      @RequestParam(required = false) Long bankAccountId,
      @AuthenticationPrincipal User user) {
    return ResponseEntity.ok()
        .contentType(org.springframework.http.MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .header(
            org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"finance-transactions-report.csv\"")
        .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store")
        .body(exports.export(user, month, currency, type, bankAccountId));
  }

  @PutMapping("/{id}/bank-account")
  public ResponseEntity<Transaction> assignBank(
      @PathVariable Long id,
      @Valid @RequestBody com.nayan.finance_tracker.dto.BankAssignmentRequest request,
      @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(transactionService.assignBank(id, request.bankAccountId(), user));
  }

  @PutMapping("/{id}")
  public ResponseEntity<Transaction> update(
      @PathVariable Long id,
      @Valid @RequestBody TransactionDTO dto,
      @AuthenticationPrincipal User user) {

    return ResponseEntity.ok(transactionService.update(id, dto, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {

    transactionService.delete(id, user);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/restore")
  public ResponseEntity<Transaction> restore(
      @PathVariable Long id, @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(transactionService.restore(id, user));
  }
}
