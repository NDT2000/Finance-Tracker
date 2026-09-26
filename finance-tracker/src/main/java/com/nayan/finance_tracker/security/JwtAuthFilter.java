package com.nayan.finance_tracker.security;

import java.io.IOException;
import java.util.Optional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.UserRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter{

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) 
        throws ServletException, IOException{

            // Read the Authorization header
            final String authHeader = request.getHeader("Authorization");

            // If no header or doesn't start with Bearer, skip the filter
            if(authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            // Extract the token (Remove "Bearer " prefix)
            final String jwt = authHeader.substring(7);

            // Extract email from token
            try {
                // Extract email from token (verifies the signature and throws if the token is bad)
                final String userEmail = jwtService.extractUsername(jwt);

                // If we have an email and no existing auth in context
                if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                    // Load the user; the account may have been deleted since the token was issued
                    Optional<User> user = userRepository.findByEmail(userEmail);

                    // Validate the token
                    if (user.isPresent() && jwtService.isTokenValid(jwt, user.get())) {

                        // Create auth token and set in security context
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                user.get(), null, user.get().getAuthorities());

                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            } catch (JwtException | IllegalArgumentException ex) {
                // Bad token: stay unauthenticated and let SecurityConfig decide (401 or public)
                log.debug("Rejected JWT: {}", ex.getClass().getSimpleName());
                SecurityContextHolder.clearContext();
            }

            // Continue the filter chain
            filterChain.doFilter(request, response);

    }
}
