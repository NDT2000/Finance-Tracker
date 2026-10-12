package com.nayan.finance_tracker.service;
import com.nayan.finance_tracker.dto.*;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.repository.*;
import com.nayan.finance_tracker.security.*;
import com.nayan.finance_tracker.exception.DuplicateResourceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.nio.charset.StandardCharsets;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authentication;
    private final SessionService sessions;
    private final AuthSessionRepository sessionRepository;
    private final SecurityAudit audit;
    @Transactional
    public SessionService.Tokens register(RegisterRequest request) {
        if (users.findByEmail(request.getEmail()).isPresent()) throw new DuplicateResourceException("Email already registered");
        User user=users.save(User.builder().fullName(request.getFullName()).email(request.getEmail())
            .password(passwords.encode(request.getPassword())).role(Role.USER).build());
        audit.record("registration",user.getId()); return sessions.create(user);
    }
    @Transactional
    public SessionService.Tokens login(String email,String password) {
        try {
            if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new BadCredentialsException("Invalid credentials");
            // Serialize successful login with password changes to prevent issuing an old-password session after revocation.
            User user=users.lockByEmail(email).orElse(null);
            authentication.authenticate(new UsernamePasswordAuthenticationToken(email,password));
            if (user == null) throw new BadCredentialsException("Invalid credentials");
            audit.record("login_success",user.getId()); return sessions.create(user);
        } catch (org.springframework.security.core.AuthenticationException ex) {
            audit.record("login_failure",null); throw ex;
        }
    }
    @Transactional
    public void changePassword(User user,PasswordChangeRequest request) {
        user=users.lockById(user.getId()).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (request.getCurrentPassword().getBytes(StandardCharsets.UTF_8).length > 72 || !passwords.matches(request.getCurrentPassword(),user.getPassword())) {
            audit.record("password_change_failure",user.getId()); throw new BadCredentialsException("Invalid credentials");
        }
        user.setPassword(passwords.encode(request.getNewPassword())); users.save(user);
        sessionRepository.revokeUser(user.getId()); audit.record("password_changed",user.getId());
    }
}
