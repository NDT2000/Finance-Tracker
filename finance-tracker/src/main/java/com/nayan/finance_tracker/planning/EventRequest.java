package com.nayan.finance_tracker.planning;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record EventRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull PlanEvent.Kind kind,
    @NotNull PlanEvent.Recurrence recurrence,
    @NotNull @Positive BigDecimal amount,
    @Min(1) @Max(36) int firstMonth,
    @Min(1) @Max(36) int lastMonth) {}
