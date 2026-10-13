package com.nayan.finance_tracker.planning;

import com.nayan.finance_tracker.entity.User;
import jakarta.validation.Valid;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
public class PlanningController {
  private final PlanningService service;

  @GetMapping
  public List<PlanResponse> list(@AuthenticationPrincipal User u) {
    return service.list(u);
  }

  @PostMapping
  public ResponseEntity<PlanResponse> create(
      @Valid @RequestBody PlanRequest r, @AuthenticationPrincipal User u) {
    return ResponseEntity.status(201).body(service.create(r, u));
  }

  @GetMapping("/{id}")
  public PlanResponse get(@PathVariable UUID id, @AuthenticationPrincipal User u) {
    return service.get(id, u);
  }

  @PutMapping("/{id}")
  public PlanResponse update(
      @PathVariable UUID id, @Valid @RequestBody PlanRequest r, @AuthenticationPrincipal User u) {
    return service.update(id, r, u);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User u) {
    service.delete(id, u);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/copy")
  public ResponseEntity<PlanResponse> copy(@PathVariable UUID id, @AuthenticationPrincipal User u) {
    return ResponseEntity.status(201).body(service.copy(id, u));
  }

  @GetMapping("/{id}/events")
  public List<EventResponse> events(@PathVariable UUID id, @AuthenticationPrincipal User u) {
    return service.listEvents(id, u);
  }

  @PostMapping("/{id}/events")
  public ResponseEntity<EventResponse> addEvent(
      @PathVariable UUID id, @Valid @RequestBody EventRequest r, @AuthenticationPrincipal User u) {
    return ResponseEntity.status(201).body(service.addEvent(id, r, u));
  }

  @PutMapping("/{id}/events/{eventId}")
  public EventResponse updateEvent(
      @PathVariable UUID id,
      @PathVariable UUID eventId,
      @Valid @RequestBody EventRequest r,
      @AuthenticationPrincipal User u) {
    return service.updateEvent(id, eventId, r, u);
  }

  @DeleteMapping("/{id}/events/{eventId}")
  public ResponseEntity<Void> deleteEvent(
      @PathVariable UUID id, @PathVariable UUID eventId, @AuthenticationPrincipal User u) {
    service.deleteEvent(id, eventId, u);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/projection")
  public Map<String, Object> projection(
      @PathVariable UUID id,
      @RequestParam(required = false) String baselineMonth,
      @AuthenticationPrincipal User u) {
    return service.project(id, baselineMonth, u);
  }
}
