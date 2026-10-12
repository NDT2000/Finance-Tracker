package com.nayan.finance_tracker.controller;
import com.nayan.finance_tracker.dto.*;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.AuthService;
import com.nayan.finance_tracker.security.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.time.Duration;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final SessionService sessions;
    private final LoginRateLimiter limiter;
    private final SecurityAudit audit;
    @Value("${application.security.cookie.secure:true}") private boolean secure;
    private void cookie(HttpServletResponse response,String token) {
        response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from("finance_refresh",token==null?"":token)
            .httpOnly(true).secure(secure).sameSite("Strict").path("/api/auth")
            .maxAge(token==null?Duration.ZERO:Duration.ofDays(30)).build().toString());
        response.setHeader(HttpHeaders.CACHE_CONTROL,"no-store");
    }
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request,HttpServletRequest req,HttpServletResponse res) {
        limiter.check(request.getEmail(),req.getRemoteAddr());
        var tokens=auth.register(request); cookie(res,tokens.refresh()); return tokens.access();
    }
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,HttpServletRequest req,HttpServletResponse res) {
        limiter.check(request.getEmail(),req.getRemoteAddr());
        var tokens=auth.login(request.getEmail(),request.getPassword()); cookie(res,tokens.refresh()); return tokens.access();
    }
    @PostMapping("/refresh")
    public AuthResponse refresh(@CookieValue(name="finance_refresh",required=false) String token,HttpServletResponse res) {
        try { var tokens=sessions.rotate(token); cookie(res,tokens.refresh()); return tokens.access(); }
        catch (org.springframework.security.core.AuthenticationException ex) { audit.record("refresh_failure",null); cookie(res,null); throw ex; }
    }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name="finance_refresh",required=false) String token,HttpServletResponse res) {
        sessions.revoke(token); cookie(res,null);
    }
    @PostMapping("/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void password(@AuthenticationPrincipal User user,@Valid @RequestBody PasswordChangeRequest request,HttpServletResponse res) {
        auth.changePassword(user,request); cookie(res,null);
    }
}
