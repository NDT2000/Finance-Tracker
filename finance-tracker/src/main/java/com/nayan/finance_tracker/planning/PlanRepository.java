package com.nayan.finance_tracker.planning;

import com.nayan.finance_tracker.entity.User;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<FinancialPlan, UUID> {
  List<FinancialPlan> findByUserOrderByNameAscIdAsc(User owner);

  Optional<FinancialPlan> findByIdAndUser(UUID id, User owner);
}
