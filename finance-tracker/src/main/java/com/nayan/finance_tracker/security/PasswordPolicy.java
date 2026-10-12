package com.nayan.finance_tracker.security;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.Locale;
@Component
public class PasswordPolicy {
    private static final Set<String> COMMON = Set.of("passwordpassword","password123456789","123456789012345",
        "1234567890123456","qwertyuiopasdfgh","letmeinletmein123","iloveyouiloveyou","correcthorsebatterystaple");
    public boolean valid(String value) {
        return value != null && value.codePointCount(0,value.length()) >= 15
            && value.getBytes(StandardCharsets.UTF_8).length <= 72 && !COMMON.contains(value.toLowerCase(Locale.ROOT));
    }
}
