package com.nayan.finance_tracker.pipeline;

import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.*;
import com.nayan.finance_tracker.repository.*;
import java.math.BigDecimal;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LedgerService {
  private final UserRepository users;
  private final TransactionRepository transactions;
  private final CurrencyRules money;

  /** Every canonical writer takes this owner lock inside its database transaction. */
  public User lock(Long owner) {
    return users.lockById(owner).orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  public void validate(Transaction value, User user) {
    value.setCurrency(money.code(value.getCurrency()));
    value.setAmount(money.amount(value.getAmount(), value.getCurrency()));
    if (value.getAccountRef() == null
        || value.getAccountRef().isBlank()
        || value.getAccountRef().length() > 80)
      throw new IllegalArgumentException("Account reference must have 1–80 characters");
    if (value.getType() == TransactionType.REFUND) {
      if (value.getId() != null && value.getId().equals(value.getRefundOf()))
        throw new IllegalArgumentException("An expense cannot refund itself");
      Transaction parent =
          transactions
              .findByIdAndUser(value.getRefundOf(), user)
              .filter(p -> !p.isDeleted() && p.getType() == TransactionType.EXPENSE)
              .orElseThrow(
                  () ->
                      new IllegalArgumentException(
                          "Refund must reference an active expense owned by this user"));
      if (!parent.getCurrency().equals(value.getCurrency())
          || !parent.getCategory().equals(value.getCategory()))
        throw new IllegalArgumentException(
            "Refund currency and category must match the original expense");
      value.setAccountRef(parent.getAccountRef());
      BigDecimal other =
          transactions.findByUserAndRefundOfAndDeletedFalse(user, parent.getId()).stream()
              .filter(t -> !Objects.equals(t.getId(), value.getId()))
              .map(Transaction::getAmount)
              .reduce(BigDecimal.ZERO, BigDecimal::add);
      if (other.add(value.getAmount()).compareTo(parent.getAmount()) > 0)
        throw new IllegalArgumentException("Refunds cannot exceed the original expense");
    } else if (value.getRefundOf() != null)
      throw new IllegalArgumentException("Only refunds may reference an expense");
    if (value.getId() != null) {
      var refunds = transactions.findByUserAndRefundOfAndDeletedFalse(user, value.getId());
      BigDecimal total =
          refunds.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
      if (!refunds.isEmpty()
          && (value.getType() != TransactionType.EXPENSE
              || value.getAmount().compareTo(total) < 0
              || refunds.stream()
                  .anyMatch(
                      t ->
                          !t.getCurrency().equals(value.getCurrency())
                              || !t.getCategory().equals(value.getCategory()))))
        throw new IllegalArgumentException("Correction would invalidate existing refunds");
    }
  }
}
