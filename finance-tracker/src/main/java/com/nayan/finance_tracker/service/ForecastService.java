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

        // Get current month and year
        LocalDate now = LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();
        int daysInMonth = now.lengthOfMonth();

        // Get all teansactions for this user and category
        List<Transaction> transactions = transactionRepository.findByUserAndCategory(user, category);

        // Filter to current month only
        List<Transaction> thisMonth = transactions.stream()
            .filter(t -> t.getDate().getMonthValue() == currentMonth && 
                         t.getDate().getYear() == currentYear)
            .collect(Collectors.toList());

        // Build the request payload for the ML service
        List<Map<String, Object>> txnList = thisMonth.stream()
            .map(t -> {
                Map<String, Object> txn = new HashMap<>();
                txn.put("amount", t.getAmount().doubleValue());
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
        log.info("Calling ML Service for category: {} with {} transactions", category, txnList.size());

        Object response = restTemplate.postForObject(ML_SERVICE_URL, payload, Object.class);
        log.info("ML Service response received for category: {}", category);
        return response;
    }
}
