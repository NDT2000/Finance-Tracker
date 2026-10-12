package com.nayan.finance_tracker;
import com.nayan.finance_tracker.security.LoginRateLimiter;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@SpringBootTest @ActiveProfiles("test") @Testcontainers
class RedisRateLimitTest {
    @Container static final GenericContainer<?> REDIS=new GenericContainer<>("redis:7-alpine").withExposedPorts(6379)
        .withCommand("redis-server","--requirepass","test-only-redis-password");
    @DynamicPropertySource static void redis(DynamicPropertyRegistry r) {
        r.add("spring.data.redis.host",REDIS::getHost); r.add("spring.data.redis.port",() -> REDIS.getMappedPort(6379));
        r.add("spring.data.redis.password",() -> "test-only-redis-password");
        r.add("application.security.rate-limit.enabled",() -> true);
    }
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired LoginRateLimiter limiter;
    @Autowired org.springframework.data.redis.core.StringRedisTemplate redis;
    @Test void actualRedisCountsAcrossInstancesAndExpiresKeys() {
        var other=new LoginRateLimiter(redis,new com.nayan.finance_tracker.security.SecurityAudit());
        org.springframework.test.util.ReflectionTestUtils.setField(other,"enabled",true);
        for (int i=0;i<10;i++) (i%2==0?limiter:other).check("Case@example.com","127.0.0.1");
        assertThatThrownBy(() -> other.check("case@example.com","127.0.0.2")).isInstanceOf(LoginRateLimiter.RateLimitException.class);
        var keys=redis.keys("finance:auth:*"); assertThat(keys).isNotEmpty();
        for (String key:keys) { assertThat(key).doesNotContain("example.com"); assertThat(redis.getExpire(key)).isBetween(1L,60L); }
    }
    @Test void loginEndpointReturns429AndRetryAfterUsingRealRedis() throws Exception {
        for (int i=0;i<10;i++) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                .header("Origin","http://localhost").header("X-Requested-With","FinanceTracker")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"email\":\"rate-http@example.com\",\"password\":\"wrong-pass\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        }
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
            .header("Origin","http://localhost").header("X-Requested-With","FinanceTracker")
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content("{\"email\":\"rate-http@example.com\",\"password\":\"wrong-pass\"}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isTooManyRequests())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Retry-After","60"));
    }
    @Test void redisOutageFailsClosed() {
        var template=org.mockito.Mockito.mock(org.springframework.data.redis.core.StringRedisTemplate.class);
        org.mockito.Mockito.when(template.execute(org.mockito.ArgumentMatchers.<org.springframework.data.redis.core.script.RedisScript<Long>>any(),org.mockito.ArgumentMatchers.anyList(),org.mockito.ArgumentMatchers.<Object[]>any()))
            .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("unavailable"));
        var limiter=new LoginRateLimiter(template,new com.nayan.finance_tracker.security.SecurityAudit());
        org.springframework.test.util.ReflectionTestUtils.setField(limiter,"enabled",true);
        assertThatThrownBy(() -> limiter.check("someone@example.com","127.0.0.1"))
            .isInstanceOf(LoginRateLimiter.SecurityUnavailableException.class);
    }
}
