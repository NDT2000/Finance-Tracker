package com.nayan.finance_tracker.pipeline;

import com.nayan.finance_tracker.entity.*;
import com.nayan.finance_tracker.exception.*;
import com.nayan.finance_tracker.repository.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchProcessor {
  private final JdbcTemplate db;
  private final CsvRows csv;
  private final LedgerService ledger;
  private final TransactionRepository transactions;

  private void outcome(
      UUID batch,
      int row,
      String status,
      String code,
      String message,
      Long transaction,
      String candidates) {
    db.update(
        "update import_rows set status=?,error_code=?,message=?,transaction_id=?,candidates=? where"
            + " batch_id=? and row_number=?",
        status,
        code,
        message,
        transaction,
        candidates,
        batch,
        row);
  }

  private String key(CsvRows.Value v, String hash, int row) {
    return v.sourceId().isEmpty() ? "file:" + hash + ":" + row : "record:" + v.sourceId();
  }

  private void assign(
      Transaction tx, CsvRows.Value v, UUID batch, int row, String account, User owner) {
    tx.setUser(owner);
    tx.setDate(v.date());
    tx.setDescription(v.description());
    tx.setCategory(v.category());
    tx.setAmount(v.amount());
    tx.setCurrency(v.currency());
    tx.setType(v.type());
    tx.setAccountRef(account);
    tx.setSourceRecordId(v.sourceId().isEmpty() ? null : v.sourceId());
    tx.setImportBatchId(batch.toString());
    tx.setSourceRow(row);
    if (v.type() == TransactionType.REFUND) {
      var parent =
          db.queryForList(
              "select transaction_id from import_identities where user_id=? and account_ref=? and"
                  + " source_id=?",
              owner.getId(),
              account,
              "record:" + v.refundOf());
      if (parent.isEmpty())
        throw new IllegalArgumentException(
            "Original refund expense is not resolved; import or review it first, then retry");
      tx.setRefundOf(((Number) parent.get(0).get("transaction_id")).longValue());
    } else tx.setRefundOf(null);
    ledger.validate(tx, owner);
  }

  private List<Transaction> matches(CsvRows.Value v, User owner) {
    return transactions.findOverlap(
        owner.getId(), v.date(), v.currency(), v.type(), v.amount(), v.category(), v.description());
  }

  private void promote(
      UUID batch,
      CsvRows.Row row,
      CsvRows.Value value,
      String fileHash,
      String account,
      User owner,
      String decision,
      Long linkId) {
    String key = key(value, fileHash, row.number());
    String payload = csv.payloadHash(value);
    var known =
        db.queryForList(
            "select transaction_id,revision,payload_hash from import_identities where user_id=? and"
                + " account_ref=? and source_id=?",
            owner.getId(),
            account,
            key);
    if (!known.isEmpty()) {
      var identity = known.get(0);
      int revision = ((Number) identity.get("revision")).intValue();
      Long id = ((Number) identity.get("transaction_id")).longValue();
      if (value.revision() < revision) {
        outcome(batch, row.number(), "STALE", null, "An older revision was ignored", id, null);
        return;
      }
      if (value.revision() == revision) {
        if (!payload.equals(identity.get("payload_hash")))
          throw new IllegalArgumentException(
              "Source ID/revision conflicts with its earlier payload");
        outcome(
            batch,
            row.number(),
            "DUPLICATE",
            null,
            "Already represented in the canonical ledger",
            id,
            null);
        return;
      }
      Transaction tx =
          transactions
              .findByIdAndUser(id, owner)
              .orElseThrow(() -> new IllegalStateException("Identity target missing"));
      // Validate on a copy: rejecting a correction must not dirty the managed original.
      Transaction copy = new Transaction();
      copy.setId(tx.getId());
      copy.setDeleted(tx.isDeleted());
      copy.setBankAccountId(tx.getBankAccountId());
      copy.setBankAccountName(tx.getBankAccountName());
      assign(copy, value, batch, row.number(), account, owner);
      tx.setDate(copy.getDate());
      tx.setCategory(copy.getCategory());
      tx.setDescription(copy.getDescription());
      tx.setAmount(copy.getAmount());
      tx.setCurrency(copy.getCurrency());
      tx.setType(copy.getType());
      tx.setAccountRef(copy.getAccountRef());
      tx.setSourceRecordId(copy.getSourceRecordId());
      tx.setImportBatchId(copy.getImportBatchId());
      tx.setSourceRow(copy.getSourceRow());
      tx.setRefundOf(copy.getRefundOf());
      transactions.saveAndFlush(tx);
      db.update(
          "update import_identities set revision=?,payload_hash=? where user_id=? and account_ref=?"
              + " and source_id=?",
          value.revision(),
          payload,
          owner.getId(),
          account,
          key);
      outcome(batch, row.number(), "CORRECTED", null, null, id, null);
      return;
    }
    var candidates = matches(value, owner);
    if (decision == null && (value.sourceId().isEmpty() || !candidates.isEmpty())) {
      outcome(
          batch,
          row.number(),
          "NEEDS_REVIEW",
          value.sourceId().isEmpty() ? "SOURCE_ID_MISSING" : "POSSIBLE_OVERLAP",
          "Confirm source identity: link an existing entry or explicitly keep a distinct event",
          null,
          csv.encode(candidates.stream().map(Transaction::getId).toList()));
      return;
    }
    Transaction tx;
    if ("LINK".equals(decision)) {
      tx =
          candidates.stream()
              .filter(t -> Objects.equals(t.getId(), linkId))
              .findFirst()
              .orElseThrow(
                  () ->
                      new IllegalArgumentException("Link must match an active entry owned by you"));
      // A canonical event with another stable source ID cannot be reassigned silently.
      if (tx.getSourceRecordId() != null
          && !value.sourceId().isEmpty()
          && !tx.getSourceRecordId().equals(value.sourceId()))
        throw new IllegalArgumentException(
            "Entry already has another source identity; keep both or ignore");
      String existingSource = tx.getSourceRecordId();
      tx.setOrigin("LINKED");
      assign(tx, value, batch, row.number(), account, owner);
      if (value.sourceId().isEmpty()) tx.setSourceRecordId(existingSource);
    } else {
      tx = new Transaction();
      tx.setOrigin("IMPORTED");
      assign(tx, value, batch, row.number(), account, owner);
    }
    tx = transactions.saveAndFlush(tx);
    db.update(
        "insert into"
            + " import_identities(user_id,account_ref,source_id,transaction_id,revision,payload_hash)"
            + " values(?,?,?,?,?,?)",
        owner.getId(),
        account,
        key,
        tx.getId(),
        value.revision(),
        payload);
    outcome(
        batch,
        row.number(),
        "LINK".equals(decision) ? "LINKED" : "PROMOTED",
        null,
        null,
        tx.getId(),
        null);
  }

  private void finish(UUID id, long duration) {
    long rejected =
        db.queryForObject(
            "select count(*) from import_rows where batch_id=? and status='REJECTED'",
            Long.class,
            id);
    long review =
        db.queryForObject(
            "select count(*) from import_rows where batch_id=? and status='NEEDS_REVIEW'",
            Long.class,
            id);
    String status =
        review > 0 ? "NEEDS_REVIEW" : rejected > 0 ? "COMPLETED_WITH_REJECTIONS" : "COMPLETED";
    db.update(
        "update import_batches set"
            + " status=?,stage='COMMITTED',finished_at=now(),claim_token=null,lease_until=null,duration_ms=?,error_code=null"
            + " where id=?",
        status,
        duration,
        id);
  }

  @Transactional
  public void process(UUID id, UUID claim) {
    long start = System.nanoTime();
    var owners = db.queryForList("select user_id from import_batches where id=?", id);
    if (owners.isEmpty()) return;
    User owner = ledger.lock(((Number) owners.get(0).get("user_id")).longValue());
    var batches =
        db.queryForList(
            "select * from import_batches where id=? and claim_token=? and status='PROCESSING' for"
                + " update",
            id,
            claim);
    if (batches.isEmpty()) return;
    var batch = batches.get(0);
    String account = (String) batch.get("account_ref");
    String hash = (String) batch.get("file_hash");
    List<CsvRows.Row> rows = csv.read((byte[]) batch.get("source_bytes"));
    db.update("update import_batches set total_rows=? where id=?", rows.size(), id);
    for (var row : rows)
      db.update(
          "insert into import_rows(batch_id,row_number,raw_data) values(?,?,?) on conflict do"
              + " nothing",
          id,
          row.number(),
          csv.encode(row.raw()));
    // Expenses/income precede refunds, so file order does not dictate reference resolution.
    var ordered = new ArrayList<>(rows);
    ordered.sort(
        Comparator.comparing(
            r -> "REFUND".equals(r.raw().getOrDefault("type", "").strip()) ? 1 : 0));
    for (var row : ordered) {
      String prior =
          db.queryForObject(
              "select status from import_rows where batch_id=? and row_number=?",
              String.class,
              id,
              row.number());
      if (Set.of("PROMOTED", "CORRECTED", "LINKED", "DUPLICATE", "STALE", "IGNORED")
          .contains(prior)) continue;
      try {
        promote(id, row, csv.value(row), hash, account, owner, null, null);
      } catch (IllegalArgumentException ex) {
        outcome(id, row.number(), "REJECTED", "ROW_VALIDATION_FAILED", safeMessage(ex), null, null);
      }
    }
    long duration = (System.nanoTime() - start) / 1_000_000;
    finish(id, duration);
    log.info(
        "pipeline_event=completed batch_id={} owner_id={} rows={} duration_ms={}",
        id,
        owner.getId(),
        rows.size(),
        duration);
  }

  private String safeMessage(IllegalArgumentException ex) {
    String msg = ex.getMessage();
    if (msg == null || msg.length() > 255) return "Invalid row value";
    return msg;
  }

  @Transactional
  public void review(UUID id, int number, Long ownerId, String action, Long target) {
    User owner = ledger.lock(ownerId);
    var batches =
        db.queryForList(
            "select account_ref,file_hash,status,source_bytes from import_batches where id=? and"
                + " user_id=? for update",
            id,
            ownerId);
    if (batches.isEmpty()) throw new ResourceNotFoundException("Import not found");
    var batch = batches.get(0);
    if (Set.of("PROCESSING", "QUEUED").contains(batch.get("status")))
      throw new DuplicateResourceException("Wait for processing to finish");
    var raw =
        db.queryForList(
            "select status from import_rows where batch_id=? and row_number=?", id, number);
    if (raw.isEmpty()) throw new ResourceNotFoundException("Row not found");
    if (!"NEEDS_REVIEW".equals(raw.get(0).get("status")))
      throw new DuplicateResourceException("Row is not awaiting review");
    if ("IGNORE".equals(action))
      outcome(id, number, "IGNORED", null, "Explicitly ignored by the owner", null, null);
    else {
      if (!Set.of("LINK", "KEEP_BOTH").contains(action))
        throw new IllegalArgumentException("Invalid review action");
      var row = csv.read((byte[]) batch.get("source_bytes")).get(number - 1);
      promote(
          id,
          row,
          csv.value(row),
          (String) batch.get("file_hash"),
          (String) batch.get("account_ref"),
          owner,
          action,
          target);
    }
    finish(id, 0);
    log.info("pipeline_event=reviewed batch_id={} owner_id={} row={}", id, ownerId, number);
  }
}
