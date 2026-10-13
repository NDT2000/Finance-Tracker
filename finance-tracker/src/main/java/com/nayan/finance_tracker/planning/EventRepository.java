package com.nayan.finance_tracker.planning;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<PlanEvent, UUID> {
  List<PlanEvent> findByPlanOrderByFirstMonthAscIdAsc(FinancialPlan plan);

  Optional<PlanEvent> findByIdAndPlan(UUID id, FinancialPlan plan);

  long countByPlan(FinancialPlan plan);

  void deleteByPlan(FinancialPlan plan);
}
