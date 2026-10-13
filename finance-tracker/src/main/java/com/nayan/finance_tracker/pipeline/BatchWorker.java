package com.nayan.finance_tracker.pipeline;

import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BatchWorker {
  private final JdbcTemplate db;
  private final BatchProcessor processor;

  @Value("${application.pipeline.worker.enabled:true}")
  private boolean enabled;

  @Scheduled(fixedDelayString = "${application.pipeline.poll-ms:1000}")
  public void scheduled() {
    if (enabled) {
      try {
        runOnce();
      } catch (Exception ex) {
        log.error("pipeline_event=worker_unavailable type={}", ex.getClass().getSimpleName());
      }
    }
  }

  public boolean runOnce() {
    db.update(
        "with expired as (select id from import_batches where status='PROCESSING' and"
            + " lease_until<now() and attempts>=3 for update skip locked) update import_batches b"
            + " set status='FAILED',error_code='LEASE_EXHAUSTED',retryable=true,claim_token=null,lease_until=null"
            + " from expired e where b.id=e.id");
    UUID token = UUID.randomUUID();
    var jobs =
        db.queryForList(
            "with candidate as (select id from import_batches where ((status='QUEUED' and"
                + " next_attempt_at<=now()) or (status='PROCESSING' and lease_until<now())) and"
                + " attempts<3 order by created_at for update skip locked limit 1) update"
                + " import_batches b set"
                + " status='PROCESSING',stage='VALIDATING_AND_PROMOTING',started_at=now(),attempts=attempts+1,claim_token=?,lease_until=now()+interval"
                + " '10 minutes' from candidate c where b.id=c.id returning b.id",
            token);
    if (jobs.isEmpty()) return false;
    UUID id = (UUID) jobs.get(0).get("id");
    try {
      processor.process(id, token);
    } catch (Exception ex) {
      boolean retry = !(ex instanceof IllegalArgumentException);
      String code = retry ? "JOB_EXECUTION_ERROR" : ex.getMessage();
      if (code == null || !code.matches("[A-Z_]{1,100}")) code = "CSV_FORMAT_INVALID";
      db.update(
          "update import_batches set status=case when ? and attempts<3 then 'QUEUED' else 'FAILED'"
              + " end,stage='FAILED',retryable=?,error_code=?,next_attempt_at=now()+(power(2,attempts)*5)*interval"
              + " '1 second',finished_at=now(),claim_token=null,lease_until=null where id=? and"
              + " claim_token=?",
          retry,
          retry,
          code,
          id,
          token);
      log.warn(
          "pipeline_event=failed batch_id={} code={} type={}",
          id,
          code,
          ex.getClass().getSimpleName());
    }
    return true;
  }
}
