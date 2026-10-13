package com.nayan.finance_tracker.planning;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record PlanRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
    @NotBlank String startMonth,
    @Min(1) @Max(36) int months,
    @NotNull BigDecimal openingCash,
    @NotNull @DecimalMin("0") BigDecimal openingInvestments,
    @NotNull @DecimalMin("0") BigDecimal cashReserve,
    @NotNull @DecimalMin("-100") @DecimalMax("100") @Digits(integer = 3, fraction = 4)
        BigDecimal annualReturnPercent) {}
