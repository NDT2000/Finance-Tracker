package com.nayan.finance_tracker.security;
import jakarta.validation.*;
import java.lang.annotation.*;
@Target({ElementType.FIELD}) @Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy=StrongPasswordValidator.class)
public @interface StrongPassword {
    String message() default "Password must have at least 15 characters, at most 72 UTF-8 bytes, and not be a common password";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
