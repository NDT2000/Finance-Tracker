package com.nayan.finance_tracker.security;
import com.nayan.finance_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import io.jsonwebtoken.JwtException;
import java.io.IOException;

@Component @RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;
    private final SessionService sessions;
    private final ApiErrors errors;
    private final SecurityAudit audit;
    @Override protected boolean shouldNotFilter(HttpServletRequest req) { return java.util.Set.of("/api/auth/login","/api/auth/register","/api/auth/refresh","/api/auth/logout").contains((req.getRequestURI().substring(req.getContextPath().length()))); }
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        String header = req.getHeader("Authorization");
        if (header == null) { chain.doFilter(req,res); return; }
        try {
            if (!header.startsWith("Bearer ")) throw new IllegalArgumentException();
            var claims = jwt.parse(header.substring(7));
            var user = users.findByEmail(claims.getSubject()).orElseThrow(IllegalArgumentException::new);
            if (!sessions.active(claims.get("sid",String.class),user.getId())) throw new IllegalArgumentException();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,null,user.getAuthorities()));
        } catch (JwtException | IllegalArgumentException ex) {
            SecurityContextHolder.clearContext(); audit.record("invalid_access_token",null);
            errors.send(req,res,HttpStatus.UNAUTHORIZED,"Invalid or expired access token"); return;
        }
        chain.doFilter(req,res);
    }
}
