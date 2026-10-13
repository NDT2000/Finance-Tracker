package com.nayan.finance_tracker.pipeline;

import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
  private final JdbcTemplate db;
  private final CurrencyRules money;

  @org.springframework.transaction.annotation.Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Map<String, Object> summary(Long owner, YearMonth month, String currency) {
    money.code(currency);
    var start = month.atDay(1);
    var end = month.plusMonths(1).atDay(1);
    var rows =
        db.queryForList(
            "select type,amount,category,date from transactions where user_id=? and currency=? and"
                + " date>=? and date<? and not deleted order by date,id",
            owner,
            currency,
            start,
            end);
    BigDecimal income = BigDecimal.ZERO, gross = BigDecimal.ZERO, refunds = BigDecimal.ZERO;
    Map<String, BigDecimal> categories = new TreeMap<>(), days = new TreeMap<>();
    for (var row : rows) {
      var amount = (BigDecimal) row.get("amount");
      String type = (String) row.get("type");
      if (type.equals("INCOME")) {
        income = income.add(amount);
        continue;
      }
      if (type.equals("REFUND")) {
        refunds = refunds.add(amount);
        amount = amount.negate();
      } else gross = gross.add(amount);
      categories.merge((String) row.get("category"), amount, BigDecimal::add);
      days.merge(row.get("date").toString(), amount, BigDecimal::add);
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("month", month.toString());
    result.put("currency", currency);
    result.put("income", income.toPlainString());
    result.put("grossExpenses", gross.toPlainString());
    result.put("refunds", refunds.toPlainString());
    result.put("netExpenses", gross.subtract(refunds).toPlainString());
    result.put("netSavings", income.subtract(gross).add(refunds).toPlainString());
    result.put("transactionCount", rows.size());
    result.put(
        "byCategory",
        categories.entrySet().stream()
            .map(e -> Map.of("category", e.getKey(), "amount", e.getValue().toPlainString()))
            .toList());
    result.put(
        "byDay",
        days.entrySet().stream()
            .map(e -> Map.of("date", e.getKey(), "amount", e.getValue().toPlainString()))
            .toList());
    result.put("asOf", Instant.now().toString());
    result.put(
        "imports",
        db.queryForMap(
            "select count(*) filter(where status in ('QUEUED','PROCESSING')) as"
                + " pending_jobs,count(*) filter(where status='FAILED') as failed_jobs,count(*)"
                + " filter(where status='NEEDS_REVIEW') as review_jobs,max(finished_at)"
                + " filter(where stage='COMMITTED') as latest_import_at,min(created_at)"
                + " filter(where status in ('QUEUED','PROCESSING')) as oldest_pending_at from"
                + " import_batches where user_id=?",
            owner));
    return result;
  }
}
