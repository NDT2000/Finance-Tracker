package com.nayan.finance_tracker;
import com.nayan.finance_tracker.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
class JwtConfigurationTest {
    @Test void startupRejectsWeakInvalidHexAndExcessiveLifetimes() {
        for (String secret:new String[]{"short","a".repeat(63),"z".repeat(64)}) {
            JwtService jwt=new JwtService(); ReflectionTestUtils.setField(jwt,"secretKey",secret); ReflectionTestUtils.setField(jwt,"jwtExpiration",900000L);
            assertThatThrownBy(jwt::initialize).isInstanceOf(IllegalStateException.class);
        }
        JwtService jwt=new JwtService(); ReflectionTestUtils.setField(jwt,"secretKey","a".repeat(64)); ReflectionTestUtils.setField(jwt,"jwtExpiration",86400000L);
        assertThatThrownBy(jwt::initialize).isInstanceOf(IllegalStateException.class);
    }
}
