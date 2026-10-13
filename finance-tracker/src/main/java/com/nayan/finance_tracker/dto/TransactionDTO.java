package com.nayan.finance_tracker.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nayan.finance_tracker.entity.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class TransactionDTO {
    
    @NotBlank(message = "Description is required")
    @jakarta.validation.constraints.Size(max=255)
    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @NotNull(message = "Type is required")
    private TransactionType type;

    @NotBlank(message = "Category is required")
    @jakarta.validation.constraints.Size(max=100)
    private String category;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @jakarta.validation.constraints.Pattern(regexp="[A-Z]{3}")
    private String currency = "USD";
    @jakarta.validation.constraints.Size(max=80)
    private String accountRef = "default";
    private Long refundOf;
    @Positive
    private Long bankAccountId;

}
