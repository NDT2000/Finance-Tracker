package com.nayan.finance_tracker.dto;

import com.nayan.finance_tracker.entity.AccountType;
import com.nayan.finance_tracker.entity.FinancialAccount;

public record AccountResponse(Long id, String name, AccountType type, String currency) {
  public static AccountResponse from(FinancialAccount account) {
    return new AccountResponse(
        account.getId(), account.getName(), account.getType(), account.getCurrency());
  }
}
