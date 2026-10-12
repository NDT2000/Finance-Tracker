package com.nayan.finance_tracker.config;
import com.nayan.finance_tracker.security.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
@Configuration
public class FilterRegistrationConfig {
    @Bean FilterRegistrationBean<JwtAuthFilter> jwtRegistration(JwtAuthFilter filter) {
        var registration=new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
    @Bean FilterRegistrationBean<AuthOriginFilter> originRegistration(AuthOriginFilter filter) {
        var registration=new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
}
