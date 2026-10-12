package com.nayan.finance_tracker.security;
import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.repository.*;
import com.nayan.finance_tracker.dto.AuthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.BadCredentialsException;
import java.time.Instant;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;

@Service @RequiredArgsConstructor
public class SessionService {
    private final AuthSessionRepository sessions;
    private final RefreshCredentialRepository credentials;
    private final UserRepository users;
    private final JwtService jwt;
    private final SecurityAudit audit;
    public record Tokens(AuthResponse access, String refresh) {}
    private String hash(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw new BadCredentialsException("Invalid session");
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private Tokens issue(AuthSession session, User user) {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshCredential credential = new RefreshCredential();
        credential.setTokenHash(hash(token)); credential.setSessionId(session.getId()); credentials.save(credential);
        String access = jwt.generateToken(Map.of("sid",session.getId()),user);
        return new Tokens(new AuthResponse(access,user.getEmail(),user.getFullName()),token);
    }
    @Transactional
    public Tokens create(User user) {
        AuthSession session = new AuthSession(); session.setId(UUID.randomUUID().toString());
        session.setUserId(user.getId()); session.setExpiresAt(Instant.now().plusSeconds(30L*86400));
        sessions.save(session); return issue(session,user);
    }
    @Transactional(noRollbackFor=BadCredentialsException.class)
    public Tokens rotate(String token) {
        String hash = hash(token);
        String id = credentials.sessionIdForHash(hash).orElseThrow(() -> new BadCredentialsException("Invalid session"));
        AuthSession session = sessions.lockById(id).orElseThrow(() -> new BadCredentialsException("Invalid session"));
        RefreshCredential old = credentials.findById(hash).orElseThrow(() -> new BadCredentialsException("Invalid session"));
        if (old.isConsumed()) {
            session.setRevoked(true); audit.record("refresh_reuse",session.getUserId());
            throw new BadCredentialsException("Invalid session");
        }
        if (session.isRevoked() || !session.getExpiresAt().isAfter(Instant.now()))
            throw new BadCredentialsException("Invalid session");
        User user = users.findById(session.getUserId()).orElseThrow(() -> new BadCredentialsException("Invalid session"));
        old.setConsumed(true); audit.record("refresh_rotated",user.getId()); return issue(session,user);
    }
    @Transactional
    public void revoke(String token) {
        if (token == null) return;
        try {
            credentials.sessionIdForHash(hash(token)).flatMap(sessions::lockById).ifPresent(session -> {
                session.setRevoked(true); audit.record("logout",session.getUserId());
            });
        } catch (BadCredentialsException ignored) { /* Clear invalid cookies too. */ }
    }
    public boolean active(String id, Long userId) {
        return id != null && sessions.findById(id).filter(s -> !s.isRevoked() && s.getUserId().equals(userId)
            && s.getExpiresAt().isAfter(Instant.now())).isPresent();
    }
}
