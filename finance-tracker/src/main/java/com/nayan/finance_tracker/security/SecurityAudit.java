package com.nayan.finance_tracker.security;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
@Component @Slf4j
public class SecurityAudit {
    // Structured events: deliberately exclude email, IP, tokens, passwords and request bodies.
    public void record(String event, Long userId) {
        log.info("security_event={} user_id={}",event,userId == null ? "unknown" : userId);
    }
}
