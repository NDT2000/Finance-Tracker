package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.dto.*;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.*;
import com.nayan.finance_tracker.pipeline.CurrencyRules;
import com.nayan.finance_tracker.repository.*;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FinancialAccountService {
  private final FinancialAccountRepository accounts;
  private final UserRepository users;
  private final CurrencyRules currencies;

  @Transactional(readOnly = true)
  public List<AccountResponse> list(User user) {
    return accounts.findByUserOrderByCreatedAtAsc(user).stream()
        .map(AccountResponse::from)
        .toList();
  }

  @Transactional
  public AccountResponse create(User authenticated, CreateAccountRequest request) {
    // Serialize this owner's changes so concurrent case-insensitive duplicates cannot slip through.
    User owner =
        users
            .lockById(authenticated.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    String name = request.name().strip();
    if (name.isBlank()) throw new IllegalArgumentException("Account name must not be blank");
    String currency = currencies.code(request.currency());
    if (accounts.existsByUserAndNameIgnoreCase(owner, name))
      throw new DuplicateResourceException("An account with this name already exists");
    FinancialAccount account =
        FinancialAccount.builder()
            .user(owner)
            .name(name)
            .type(request.type())
            .currency(currency)
            .status(AccountStatus.ACTIVE)
            .balance(BigDecimal.ZERO)
            .build();
    return AccountResponse.from(accounts.saveAndFlush(account));
  }

  @Transactional
  public void delete(User authenticated, Long id) {
    User owner =
        users
            .lockById(authenticated.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    FinancialAccount account =
        accounts
            .findByIdAndUser(id, owner)
            .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    // Existing transactions and import provenance have no account FK and are deliberately retained.
    accounts.delete(account);
  }
}
