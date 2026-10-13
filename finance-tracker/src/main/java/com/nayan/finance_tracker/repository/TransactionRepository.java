package com.nayan.finance_tracker.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.TransactionType;
import com.nayan.finance_tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Transaction> {

    
    List<Transaction> findByUser(User user);

    List<Transaction> findByUserAndCategory(User user, String category);

    Optional<Transaction> findByIdAndUser(Long id, User user);

    List<Transaction> findByUserAndCategoryAndTypeAndDateBetween(
    User user, String category, TransactionType type, LocalDate start, LocalDate end);

    List<Transaction> findByUserAndDeletedFalse(User user);
    List<Transaction> findByUserAndCategoryAndCurrencyAndTypeInAndDateBetweenAndDeletedFalse(
        User user, String category, String currency, List<TransactionType> types, LocalDate start, LocalDate end);
    List<Transaction> findByUserAndRefundOf(User user, Long refundOf);
    List<Transaction> findByUserAndRefundOfAndDeletedFalse(User user,Long refundOf);
    @org.springframework.data.jpa.repository.Query("select t from Transaction t where t.user.id=:owner and t.date=:date and t.currency=:currency and t.type=:type and t.amount=:amount and trim(t.category)=:category and trim(t.description)=:description and t.deleted=false")
    List<Transaction> findOverlap(Long owner,LocalDate date,String currency,TransactionType type,java.math.BigDecimal amount,String category,String description);
    List<Transaction> findByUserAndCurrencyAndDateGreaterThanEqualAndDateLessThanAndDeletedFalse(User user,String currency,LocalDate start,LocalDate end);
}
