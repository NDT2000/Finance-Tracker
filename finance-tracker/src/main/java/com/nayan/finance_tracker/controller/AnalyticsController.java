package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.pipeline.AnalyticsService;
import java.time.YearMonth;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
  private final AnalyticsService analytics;

  @GetMapping("/monthly")
  public Map<String, Object> summary(
      @AuthenticationPrincipal User user,
      @RequestParam(required = false) String month,
      @RequestParam(defaultValue = "USD") String currency) {
    return analytics.summary(
        user.getId(),
        month == null ? YearMonth.now(java.time.ZoneOffset.UTC) : YearMonth.parse(month),
        currency);
  }

  @GetMapping("/currencies")
  public java.util.List<Map<String, Object>> currencies() {
    return java.util.Currency.getAvailableCurrencies().stream()
        .filter(c -> c.getDefaultFractionDigits() >= 0 && c.getDefaultFractionDigits() <= 3)
        .sorted(java.util.Comparator.comparing(java.util.Currency::getCurrencyCode))
        .map(
            c ->
                Map.<String, Object>of(
                    "code", c.getCurrencyCode(), "digits", c.getDefaultFractionDigits()))
        .toList();
  }
}
