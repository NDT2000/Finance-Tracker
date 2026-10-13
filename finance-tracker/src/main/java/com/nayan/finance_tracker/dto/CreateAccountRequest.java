package com.nayan.finance_tracker.dto;

import com.nayan.finance_tracker.entity.AccountType;
import jakarta.validation.constraints.*;

public record CreateAccountRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull AccountType type,
    @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency) {}
