package com.nayan.finance_tracker.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.function.Function;

@Service
public class JwtService {
    @Value("${application.security.jwt.secret}") private String secretKey;
    @Value("${application.security.jwt.expiration:900000}") private long jwtExpiration;
    private SecretKey signingKey;
    @PostConstruct
    public void initialize() {
        if (secretKey == null || !secretKey.matches("[0-9a-fA-F]{64,}") || secretKey.length()%2 != 0)
            throw new IllegalStateException("JWT_SECRET must be hexadecimal and at least 256 bits");
        if (jwtExpiration <= 0 || jwtExpiration > 900000)
            throw new IllegalStateException("Access token lifetime must be between 1 and 900000 milliseconds");
        signingKey = Keys.hmacShaKeyFor(HexFormat.of().parseHex(secretKey));
    }
    public String generateToken(UserDetails user) { return generateToken(Map.of(), user); }
    public String generateToken(Map<String,Object> claims, UserDetails user) {
        return Jwts.builder().claims(claims).subject(user.getUsername()).issuer("finance-tracker")
            .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+jwtExpiration))
            .signWith(signingKey, Jwts.SIG.HS256).compact();
    }
    public Claims parse(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).requireIssuer("finance-tracker")
            .build().parseSignedClaims(token).getPayload();
        if (claims.getExpiration() == null || claims.getSubject() == null)
            throw new IllegalArgumentException("Required token claims missing");
        return claims;
    }
    public boolean isTokenValid(String token, UserDetails user) { return user.getUsername().equals(extractUsername(token)); }
    public String extractUsername(String token) { return parse(token).getSubject(); }
    public Date extractExpiration(String token) { return parse(token).getExpiration(); }
    public <T> T extractClaim(String token, Function<Claims,T> resolver) { return resolver.apply(parse(token)); }
}
