package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.dto.*;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.FinancialAccountService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class FinancialAccountController {
  private final FinancialAccountService accounts;

  @GetMapping
  public List<AccountResponse> list(@AuthenticationPrincipal User user) {
    return accounts.list(user);
  }

  @PostMapping
  public ResponseEntity<AccountResponse> create(
      @AuthenticationPrincipal User user, @Valid @RequestBody CreateAccountRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(accounts.create(user, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
    accounts.delete(user, id);
    return ResponseEntity.noContent().build();
  }
}
