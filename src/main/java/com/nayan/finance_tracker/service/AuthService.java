package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.dto.AuthResponse;
import com.nayan.finance_tracker.dto.RegisterRequest;
import com.nayan.finance_tracker.entity.Role;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.UserRepository;
import com.nayan.finance_tracker.security.JwtService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        // Check if user already exist
        if(userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // Build the user
        var user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();
        
        // Save to Database
        userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        // Generate and return token
        var token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }

    public AuthResponse login(String email, String password) {
        // This throws an exception if credentials are wrong
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));

        // If we get here, credentials are correct
        var user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        log.info("User logged in: {}", email);

        var token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }
    
}
