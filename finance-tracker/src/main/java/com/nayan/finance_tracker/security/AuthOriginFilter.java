package com.nayan.finance_tracker.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.util.List;

@Component
public class AuthOriginFilter extends OncePerRequestFilter {
    private final ApiErrors errors;
    private final List<String> origins;
    public AuthOriginFilter(ApiErrors errors,@Value("${application.security.cors.origins}") List<String> origins) {
        this.errors=errors; this.origins=origins;
    }
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        // Cookie auth endpoints require an exact trusted Origin and a non-simple custom header.
        if ("POST".equals(req.getMethod()) && (req.getRequestURI().substring(req.getContextPath().length())).startsWith("/api/auth/")
            && (!origins.contains(req.getHeader("Origin")) || !"FinanceTracker".equals(req.getHeader("X-Requested-With")))) {
            errors.send(req,res,HttpStatus.FORBIDDEN,"Untrusted authentication request"); return;
        }
        chain.doFilter(req,res);
    }
}
