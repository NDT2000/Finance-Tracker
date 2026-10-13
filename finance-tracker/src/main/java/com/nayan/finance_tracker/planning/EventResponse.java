package com.nayan.finance_tracker.planning;

import java.util.UUID;

public record EventResponse(
    UUID id,
    String name,
    PlanEvent.Kind kind,
    PlanEvent.Recurrence recurrence,
    String amount,
    int firstMonth,
    int lastMonth) {
  static EventResponse from(PlanEvent e) {
    return new EventResponse(
        e.getId(),
        e.getName(),
        e.getKind(),
        e.getRecurrence(),
        e.getAmount().toPlainString(),
        e.getFirstMonth(),
        e.getLastMonth());
  }
}
