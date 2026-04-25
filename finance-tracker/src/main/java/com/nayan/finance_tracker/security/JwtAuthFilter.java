package com.nayan.finance_tracker.security;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

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
            final String userEmail = jwtService.extractUsername(jwt);

            // If we have an email and no existing auth in context
            if(userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Load the user from the database
                User userDetails = userRepository.findByEmail(userEmail).orElseThrow(() -> new RuntimeException("User not found"));

                // Validate the token
                if(jwtService.isTokenValid(jwt, userDetails)) {

                    // Create auth token and set in security context
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }

            // Continue the filter chain
            filterChain.doFilter(request, response);

    }
}
