package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.dto.TransactionDTO;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.*;
import com.nayan.finance_tracker.pipeline.LedgerService;
import com.nayan.finance_tracker.repository.TransactionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionService {
  private final TransactionRepository transactions;
  private final LedgerService ledger;

  private void assign(Transaction t, TransactionDTO dto) {
    t.setDescription(dto.getDescription());
    t.setAmount(dto.getAmount());
    t.setCategory(dto.getCategory());
    t.setType(dto.getType());
    t.setDate(dto.getDate());
    t.setCurrency(dto.getCurrency());
    t.setAccountRef(dto.getAccountRef());
    t.setRefundOf(dto.getRefundOf());
  }

  public Transaction create(TransactionDTO dto, User user) {
    user = ledger.lock(user.getId());
    var t = new Transaction();
    t.setUser(user);
    assign(t, dto);
    ledger.validate(t, user);
    return transactions.save(t);
  }

  public List<Transaction> getAllForUser(User user) {
    return transactions.findByUserAndDeletedFalse(user);
  }

  public List<Transaction> forPeriod(User user, String month, String currency) {
    java.time.YearMonth period =
        month == null ? java.time.YearMonth.now() : java.time.YearMonth.parse(month);
    new com.nayan.finance_tracker.pipeline.CurrencyRules().code(currency);
    return transactions.findByUserAndCurrencyAndDateGreaterThanEqualAndDateLessThanAndDeletedFalse(
        user, currency, period.atDay(1), period.plusMonths(1).atDay(1));
  }

  private Transaction owned(Long id, User user) {
    return transactions
        .findByIdAndUser(id, user)
        .filter(t -> !t.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
  }

  public Transaction update(Long id, TransactionDTO dto, User user) {
    user = ledger.lock(user.getId());
    Transaction t = owned(id, user);
    if (!t.getOrigin().equals("MANUAL"))
      throw new DuplicateResourceException("Correct imported events with a higher source revision");
    Transaction copy = new Transaction();
    copy.setId(t.getId());
    copy.setUser(user);
    assign(copy, dto);
    ledger.validate(copy, user);
    assign(t, dto);
    return transactions.save(t);
  }

  public void delete(Long id, User user) {
    user = ledger.lock(user.getId());
    Transaction t = owned(id, user);
    if (!transactions.findByUserAndRefundOfAndDeletedFalse(user, id).isEmpty())
      throw new DuplicateResourceException("Resolve active refunds before excluding their expense");
    t.setDeleted(true);
    transactions.save(t); // Preserve provenance and prevent a repeated file resurrecting the entry.
  }

  public Transaction restore(Long id, User user) {
    user = ledger.lock(user.getId());
    Transaction t =
        transactions
            .findByIdAndUser(id, user)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
    ledger.validate(t, user);
    t.setDeleted(false);
    return transactions.save(t);
  }
}
