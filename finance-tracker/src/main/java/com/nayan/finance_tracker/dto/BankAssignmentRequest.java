package com.nayan.finance_tracker.dto;

import jakarta.validation.constraints.Positive;

public record BankAssignmentRequest(@Positive Long bankAccountId) {}
