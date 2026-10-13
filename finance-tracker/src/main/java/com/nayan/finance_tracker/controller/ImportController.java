package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.pipeline.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.io.IOException;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/imports")
@RequiredArgsConstructor
public class ImportController {
  private final BatchService batches;
  private final BatchProcessor processor;

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, Object>> upload(
      @AuthenticationPrincipal User user,
      @RequestParam("file") MultipartFile file,
      @RequestParam(defaultValue = "default") String accountRef)
      throws IOException {
    return ResponseEntity.accepted()
        .body(
            batches.upload(user.getId(), accountRef, file.getOriginalFilename(), file.getBytes()));
  }

  @GetMapping
  public List<Map<String, Object>> list(
      @AuthenticationPrincipal User user, @RequestParam(defaultValue = "0") int offset) {
    return batches.history(user.getId(), offset);
  }

  @GetMapping("/{id}")
  public Map<String, Object> detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    return batches.owned(id, user.getId());
  }

  @GetMapping("/{id}/rows")
  public List<Map<String, Object>> rows(
      @AuthenticationPrincipal User user,
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int offset,
      @RequestParam(defaultValue = "false") boolean rejectedOnly) {
    return batches.rows(id, user.getId(), offset, rejectedOnly);
  }

  @GetMapping("/{id}/source")
  public ResponseEntity<byte[]> source(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .header("Content-Disposition", "attachment; filename=source.csv")
        .body(batches.source(id, user.getId()));
  }

  @PostMapping("/{id}/retry")
  public ResponseEntity<Map<String, Object>> retry(
      @AuthenticationPrincipal User user, @PathVariable UUID id) {
    return ResponseEntity.accepted().body(batches.retry(id, user.getId()));
  }

  public record Decision(@NotBlank String action, Long transactionId) {}

  @PostMapping("/{id}/rows/{row}/review")
  public Map<String, Object> review(
      @AuthenticationPrincipal User user,
      @PathVariable UUID id,
      @PathVariable int row,
      @Valid @RequestBody Decision decision) {
    processor.review(id, row, user.getId(), decision.action(), decision.transactionId());
    return batches.owned(id, user.getId());
  }
}
