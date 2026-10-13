package com.nayan.finance_tracker.planning;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "plan_events")
@Getter
@Setter
@NoArgsConstructor
public class PlanEvent {
  public enum Kind {
    INCOME,
    EXPENSE,
    INVESTMENT,
    LOAN_REPAYMENT,
    WITHDRAWAL
  }

  public enum Recurrence {
    ONCE,
    MONTHLY
  }

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "plan_id", nullable = false)
  private FinancialPlan plan;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private Kind kind;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Recurrence recurrence;

  @Column(nullable = false, precision = 23, scale = 4)
  private BigDecimal amount;

  @Column(nullable = false)
  private int firstMonth;

  @Column(nullable = false)
  private int lastMonth;
}
