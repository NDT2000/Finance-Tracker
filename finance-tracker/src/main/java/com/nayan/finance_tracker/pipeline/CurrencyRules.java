package com.nayan.finance_tracker.pipeline;

import java.math.*;
import java.util.Currency;
import org.springframework.stereotype.Component;

@Component
public class CurrencyRules {
  public String code(String code) {
    if (code == null || !code.matches("[A-Z]{3}"))
      throw new IllegalArgumentException("Currency must be an uppercase ISO code");
    int digits = Currency.getInstance(code).getDefaultFractionDigits();
    if (digits < 0 || digits > 3)
      throw new IllegalArgumentException("Unsupported currency minor unit");
    return code;
  }

  public BigDecimal amount(BigDecimal amount, String currency) {
    code(currency);
    if (amount == null
        || amount.signum() <= 0
        || amount.compareTo(new BigDecimal("1000000000000000")) >= 0)
      throw new IllegalArgumentException("Amount must be positive and below 10^15");
    try {
      return amount.setScale(
          Currency.getInstance(currency).getDefaultFractionDigits(), RoundingMode.UNNECESSARY);
    } catch (ArithmeticException ex) {
      throw new IllegalArgumentException("Amount has too many currency decimal places");
    }
  }
}
