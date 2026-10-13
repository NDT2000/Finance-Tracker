package com.nayan.finance_tracker.planning;

import java.util.UUID;

public record PlanResponse(
    UUID id,
    String name,
    String currency,
    String startMonth,
    int months,
    String openingCash,
    String openingInvestments,
    String cashReserve,
    String annualReturnPercent) {
  static PlanResponse from(FinancialPlan p) {
    return new PlanResponse(
        p.getId(),
        p.getName(),
        p.getCurrency(),
        p.getStartMonth(),
        p.getMonths(),
        p.getOpeningCash().toPlainString(),
        p.getOpeningInvestments().toPlainString(),
        p.getCashReserve().toPlainString(),
        p.getAnnualReturnPercent().toPlainString());
  }
}
