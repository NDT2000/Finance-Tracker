package com.nayan.finance_tracker.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.ForecastService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/api/forecast")
@RequiredArgsConstructor
public class ForecastController {
    
    private final ForecastService forecastService;

    @GetMapping("/{category}")
    public ResponseEntity<Object> getForecast(
        @PathVariable String category,
        @RequestParam double budgetLimit,
        @AuthenticationPrincipal User user) {

        Object forecast = forecastService.getForecastForCategory(user, category, budgetLimit);
        return ResponseEntity.ok(forecast);
    }
    

}
