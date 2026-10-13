package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.ResourceNotFoundException;
import com.nayan.finance_tracker.pipeline.CurrencyRules;
import com.nayan.finance_tracker.repository.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
public class TransactionExportService {
  private final TransactionRepository transactions;
  private final FinancialAccountRepository accounts;
  private final CurrencyRules currencies;

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public byte[] export(
      User owner, String month, String currency, TransactionType type, Long bankAccountId) {
    YearMonth period = null;
    if (month != null) {
      if (!month.matches("[0-9]{4}-(0[1-9]|1[0-2])") || month.startsWith("0000"))
        throw new IllegalArgumentException("Month must use YYYY-MM with a valid year and month");
      period = YearMonth.parse(month);
    }
    final YearMonth selectedPeriod = period;
    if (currency != null) currencies.code(currency);
    if (bankAccountId != null && accounts.findByIdAndUser(bankAccountId, owner).isEmpty())
      throw new ResourceNotFoundException("Bank account not found");
    org.springframework.data.jpa.domain.Specification<Transaction> scope =
        (root, query, builder) -> {
          var filters = new ArrayList<jakarta.persistence.criteria.Predicate>();
          filters.add(builder.equal(root.get("user").get("id"), owner.getId()));
          filters.add(builder.isFalse(root.get("deleted")));
          if (selectedPeriod != null) {
            filters.add(builder.greaterThanOrEqualTo(root.get("date"), selectedPeriod.atDay(1)));
            filters.add(builder.lessThan(root.get("date"), selectedPeriod.plusMonths(1).atDay(1)));
          }
          if (currency != null) filters.add(builder.equal(root.get("currency"), currency));
          if (type != null) filters.add(builder.equal(root.get("type"), type));
          if (bankAccountId != null)
            filters.add(builder.equal(root.get("bankAccountId"), bankAccountId));
          return builder.and(filters.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    var rows = transactions.findAll(scope, org.springframework.data.domain.Sort.by("date", "id"));
    try (var output = new StringWriter();
        var csv =
            new CSVPrinter(
                output,
                CSVFormat.RFC4180
                    .builder()
                    .setHeader(
                        "id",
                        "date",
                        "description",
                        "category",
                        "type",
                        "amount",
                        "currency",
                        "bank_account_id",
                        "bank_account_name",
                        "refund_of",
                        "origin",
                        "source_transaction_id")
                    .get())) {
      for (var t : rows)
        csv.printRecord(
            t.getId(),
            t.getDate(),
            safeCell(t.getDescription()),
            safeCell(t.getCategory()),
            t.getType(),
            t.getAmount().toPlainString(),
            t.getCurrency(),
            t.getBankAccountId(),
            safeCell(t.getBankAccountName()),
            t.getRefundOf(),
            t.getOrigin(),
            safeCell(t.getSourceRecordId()));
      csv.flush();
      return output.toString().getBytes(StandardCharsets.UTF_8);
    } catch (IOException ex) {
      throw new IllegalStateException("Could not generate transaction report", ex);
    }
  }

  // Quote spreadsheet formulas even when leading spaces/control characters hide the trigger.
  // CSVPrinter separately handles commas, quotes and embedded newlines (RFC 4180).
  private static String safeCell(String value) {
    if (value == null) return "";
    String significant = value.stripLeading();
    if ((!significant.isEmpty() && "=+-@".indexOf(significant.charAt(0)) >= 0)
        || (!value.isEmpty() && "\t\r\n".indexOf(value.charAt(0)) >= 0)) return "'" + value;
    return value;
  }
}
