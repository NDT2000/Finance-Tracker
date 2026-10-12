package com.nayan.finance_tracker.security;
import jakarta.validation.*;
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword,String> {
    private final PasswordPolicy policy = new PasswordPolicy();
    public boolean isValid(String value, ConstraintValidatorContext context) { return policy.valid(value); }
}
