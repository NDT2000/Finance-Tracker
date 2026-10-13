package com.nayan.finance_tracker.planning;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nayan.finance_tracker.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "financial_plans")
@Getter
@Setter
@NoArgsConstructor
public class FinancialPlan {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  @JsonIgnore
  private User user;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, length = 3)
  private String currency;

  @Column(nullable = false, length = 7)
  private String startMonth;

  @Column(nullable = false)
  private int months;

  @Column(nullable = false, precision = 23, scale = 4)
  private BigDecimal openingCash;

  @Column(nullable = false, precision = 23, scale = 4)
  private BigDecimal openingInvestments;

  @Column(nullable = false, precision = 23, scale = 4)
  private BigDecimal cashReserve;

  @Column(nullable = false, precision = 7, scale = 4)
  private BigDecimal annualReturnPercent;
}
