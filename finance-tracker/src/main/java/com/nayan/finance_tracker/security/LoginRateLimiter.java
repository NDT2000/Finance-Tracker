package com.nayan.finance_tracker.security;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.dao.DataAccessException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

@Component @RequiredArgsConstructor
public class LoginRateLimiter {
    private final StringRedisTemplate redis;
    private final SecurityAudit audit;
    @Value("${application.security.rate-limit.enabled:true}") private boolean enabled;
    private static final DefaultRedisScript<Long> SCRIPT = new DefaultRedisScript<>(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", Long.class);
    public void check(String account,String address) {
        if (!enabled) return;
        try {
            long ipCount = increment("ip:"+digest(address));
            long accountCount = increment("account:"+digest(account.strip().toLowerCase(Locale.ROOT)));
            if (ipCount > 100 || accountCount > 10) {
                audit.record("login_rate_limited",null); throw new RateLimitException();
            }
        } catch (DataAccessException ex) { throw new SecurityUnavailableException(); }
    }
    private long increment(String suffix) {
        Long count=redis.execute(SCRIPT,List.of("finance:auth:"+suffix),"60");
        if (count==null) throw new SecurityUnavailableException(); return count;
    }
    private String digest(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    public static class RateLimitException extends RuntimeException {}
    public static class SecurityUnavailableException extends RuntimeException {}
}
