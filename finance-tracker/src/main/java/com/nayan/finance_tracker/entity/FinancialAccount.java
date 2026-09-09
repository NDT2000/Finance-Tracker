package com.nayan.finance_tracker.entity;

import java.math.BigDecimal;
import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "financial accounts",
    uniqueConstraints = {
        @UniqueConstraint (
            name = "financial_account_user_name",
            columnNames = {"user_id", "name"}
        )
    }
)

@Getter 
@Setter
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 
public class FinancialAccount {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountType type;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountStatus status;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    private void onCreate() {
        Instant now = Instant.now();

        createdAt = now;
        updatedAt = now;

        if (status == null) {
            status = AccountStatus.ACTIVE;
        }

        if (currency == null) {
            currency = "USD";
        } else {
            currency = currency.toUpperCase();
        }

        if (balance == null) {
            balance = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    private void onUpdate() {
        updatedAt = Instant.now();
    }
}
