package com.nayan.finance_tracker.pipeline;

import com.nayan.finance_tracker.exception.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BatchService {
  private final JdbcTemplate db;

  public Map<String, Object> owned(UUID id, Long owner) {
    var values =
        db.queryForList(
            "select"
                + " id,account_ref,filename,file_hash,status,stage,total_rows,attempts,retryable,error_code,created_at,started_at,finished_at,duration_ms"
                + " from import_batches where id=? and user_id=?",
            id,
            owner);
    if (values.isEmpty()) throw new ResourceNotFoundException("Import not found");
    var batch = values.get(0);
    batch.put(
        "counts",
        db.queryForList(
            "select status,count(*) as count from import_rows where batch_id=? group by status"
                + " order by status",
            id));
    return batch;
  }

  @Transactional
  public Map<String, Object> upload(Long owner, String account, String name, byte[] bytes) {
    if (bytes.length == 0 || bytes.length > 2 * 1024 * 1024)
      throw new IllegalArgumentException("Upload must be a nonempty CSV at most 2 MiB");
    if (account == null || !account.matches("[A-Za-z0-9_.-]{1,80}"))
      throw new IllegalArgumentException(
          "Account reference must use 1–80 letters, digits, dots, underscores or hyphens");
    String hash = CsvRows.hash(bytes);
    UUID id = UUID.randomUUID();
    String filename = name == null ? "expenses.csv" : name.replace('\\', '_').replace('/', '_');
    if (filename.length() > 255) filename = filename.substring(0, 255);
    int inserted =
        db.update(
            "insert into import_batches(id,user_id,account_ref,file_hash,filename,source_bytes)"
                + " values(?,?,?,?,?,?) on conflict(user_id,account_ref,file_hash) do nothing",
            id,
            owner,
            account,
            hash,
            filename,
            bytes);
    if (inserted == 0)
      id =
          db.queryForObject(
              "select id from import_batches where user_id=? and account_ref=? and file_hash=?",
              UUID.class,
              owner,
              account,
              hash);
    var result = owned(id, owner);
    result.put("repeated", inserted == 0);
    return result;
  }

  public List<Map<String, Object>> history(Long owner, int offset) {
    return db.queryForList(
        "select"
            + " id,account_ref,filename,file_hash,status,stage,total_rows,attempts,error_code,created_at,finished_at,duration_ms"
            + " from import_batches where user_id=? order by created_at desc,id limit 50 offset ?",
        owner,
        Math.max(0, offset));
  }

  public List<Map<String, Object>> rows(UUID id, Long owner, int offset, boolean rejected) {
    owned(id, owner);
    return db.queryForList(
        "select row_number,raw_data,status,error_code,message,transaction_id,candidates from"
            + " import_rows where batch_id=?"
            + (rejected ? " and status='REJECTED'" : "")
            + " order by row_number limit 100 offset ?",
        id,
        Math.max(0, offset));
  }

  public byte[] source(UUID id, Long owner) {
    owned(id, owner);
    return db.queryForObject(
        "select source_bytes from import_batches where id=?", byte[].class, id);
  }

  @Transactional
  public Map<String, Object> retry(UUID id, Long owner) {
    owned(id, owner);
    int n =
        db.update(
            "update import_batches set"
                + " status='QUEUED',stage='UPLOADED',attempts=0,error_code=null,claim_token=null,lease_until=null,finished_at=null,next_attempt_at=now()"
                + " where id=? and user_id=? and status not in ('PROCESSING','QUEUED')",
            id,
            owner);
    if (n == 0) throw new DuplicateResourceException("Import is already queued or processing");
    return owned(id, owner);
  }
}
