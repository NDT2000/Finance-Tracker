package com.nayan.finance_tracker.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.nayan.finance_tracker.entity.Transaction;
import com.nayan.finance_tracker.entity.TransactionType;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastService {
    
    private final TransactionRepository transactionRepository;
    private final RestTemplate restTemplate;

    private static final String ML_SERVICE_URL = 
        System.getenv("ML_SERVICE_URL") != null
            ? System.getenv("ML_SERVICE_URL")
            : "http://localhost:8000/forecast";

    public Object getForecastForCategory(User user, String category, double budgetLimit) {
        return getForecastForCategory(user,category,budgetLimit,"USD");
    }
    public Object getForecastForCategory(User user, String category, double budgetLimit,String currency) {
        new com.nayan.finance_tracker.pipeline.CurrencyRules().code(currency);

        // Get current month and year
        LocalDate now = LocalDate.now(java.time.ZoneOffset.UTC);
        int daysInMonth = now.lengthOfMonth();
        LocalDate start = LocalDate.now(java.time.ZoneOffset.UTC).withDayOfMonth(1);
        LocalDate end = LocalDate.now(java.time.ZoneOffset.UTC).withDayOfMonth(LocalDate.now(java.time.ZoneOffset.UTC).lengthOfMonth());

        // Get all transactions for this user and category
        // List<Transaction> transactions = transactionRepository.findByUserAndCategory(user, category);
        List<Transaction> transactions = transactionRepository.findByUserAndCategoryAndCurrencyAndTypeInAndDateBetweenAndDeletedFalse(
            user, category, currency, List.of(TransactionType.EXPENSE,TransactionType.REFUND), start, end);


        // Build the request payload for the ML service
        List<Map<String, Object>> txnList = transactions.stream()   // ← use transactions, not thisMonth
            .map(t -> {
                Map<String, Object> txn = new HashMap<>();
                txn.put("amount", t.getType()==TransactionType.REFUND ? t.getAmount().negate().doubleValue() : t.getAmount().doubleValue());
                txn.put("day", t.getDate().getDayOfMonth());
                return txn;
        })
        .collect(Collectors.toList());
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("category", category);
        payload.put("transactions", txnList);
        payload.put("budget_limit", budgetLimit);
        payload.put("current_month_days", daysInMonth);
        
        // Call with proper Content-Type header
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        // Call the Python ML service
        log.debug("Forecast service request completed");

        Object response = restTemplate.postForObject(ML_SERVICE_URL, entity, Object.class);
        log.debug("Forecast service request completed");
        return response;
    }
}
