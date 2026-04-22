package com.nayan.finance_tracker.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nayan.finance_tracker.dto.AuthResponse;
import com.nayan.finance_tracker.dto.RegisterRequest;
import com.nayan.finance_tracker.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
        @Valid @RequestBody RegisterRequest request) {
        //TODO: process POST request
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
        @RequestParam String email,
        @RequestParam String password) {
        //TODO: process POST request
        
        return ResponseEntity.ok(authService.login(email, password));
    }
    
    
    
}
