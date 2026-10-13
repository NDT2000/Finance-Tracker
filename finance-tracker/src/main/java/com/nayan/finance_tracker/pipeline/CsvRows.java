package com.nayan.finance_tracker.pipeline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nayan.finance_tracker.entity.TransactionType;
import java.io.*;
import java.math.*;
import java.nio.*;
import java.nio.charset.*;
import java.security.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.*;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CsvRows {
  private final CurrencyRules money;
  private final ObjectMapper json;

  public record Row(int number, Map<String, String> raw, boolean consistent) {}

  public record Value(
      LocalDate date,
      String category,
      String description,
      BigDecimal amount,
      String currency,
      TransactionType type,
      String sourceId,
      int revision,
      String refundOf) {}

  public static String hash(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  public List<Row> read(byte[] bytes) {
    try {
      String text =
          StandardCharsets.UTF_8
              .newDecoder()
              .onMalformedInput(CodingErrorAction.REPORT)
              .decode(ByteBuffer.wrap(bytes))
              .toString();
      if (text.startsWith("\ufeff")) text = text.substring(1);
      var format =
          CSVFormat.RFC4180
              .builder()
              .setHeader()
              .setSkipHeaderRecord(true)
              .setIgnoreEmptyLines(false)
              .get();
      try (var parser = format.parse(new StringReader(text))) {
        List<String> header = parser.getHeaderNames();
        Set<String> allowed =
            Set.of(
                "date",
                "category",
                "description",
                "amount",
                "currency",
                "type",
                "source_transaction_id",
                "revision",
                "refund_of");
        if (!header.containsAll(List.of("date", "category", "description", "amount", "currency"))
            || new HashSet<>(header).size() != header.size()
            || !allowed.containsAll(header))
          throw new IllegalArgumentException("CSV_HEADER_INVALID");
        List<Row> rows = new ArrayList<>();
        for (var record : parser) {
          if (rows.size() >= 5000) throw new IllegalArgumentException("CSV_TOO_MANY_ROWS");
          Map<String, String> raw = new LinkedHashMap<>();
          for (int i = 0; i < record.size(); i++)
            raw.put(i < header.size() ? header.get(i) : "extra_" + i, record.get(i));
          rows.add(new Row(rows.size() + 1, raw, record.isConsistent()));
        }
        if (rows.isEmpty()) throw new IllegalArgumentException("CSV_EMPTY");
        return rows;
      }
    } catch (IOException | UncheckedIOException ex) {
      throw new IllegalArgumentException("CSV_ENCODING_OR_FORMAT_INVALID");
    }
  }

  private String field(Row row, String key, int max, boolean required) {
    String value = row.raw().getOrDefault(key, "").strip();
    if (value.length() > max || (required && value.isBlank()))
      throw new IllegalArgumentException("Invalid " + key);
    return value;
  }

  public Value value(Row row) {
    if (!row.consistent()) throw new IllegalArgumentException("Wrong column count");
    String amount = field(row, "amount", 30, true);
    if (!amount.matches("[0-9]+(\\.[0-9]{1,4})?"))
      throw new IllegalArgumentException("Amount must be plain positive decimal text");
    String currency = money.code(field(row, "currency", 3, true));
    String source = field(row, "source_transaction_id", 100, false);
    String revision = field(row, "revision", 10, false);
    int version = revision.isEmpty() ? 1 : Integer.parseInt(revision);
    if (version < 1 || (version > 1 && source.isEmpty()))
      throw new IllegalArgumentException("Corrections require a source ID and positive revision");
    String type = field(row, "type", 10, false);
    TransactionType kind = type.isEmpty() ? TransactionType.EXPENSE : TransactionType.valueOf(type);
    String refund = field(row, "refund_of", 100, false);
    if ((kind == TransactionType.REFUND && (refund.isEmpty() || source.isEmpty()))
        || (kind != TransactionType.REFUND && !refund.isEmpty()))
      throw new IllegalArgumentException(
          "Refunds require their own source ID and an original expense source ID");
    return new Value(
        LocalDate.parse(field(row, "date", 10, true)),
        field(row, "category", 100, true),
        field(row, "description", 255, true),
        money.amount(new BigDecimal(amount), currency),
        currency,
        kind,
        source,
        version,
        refund);
  }

  public String payloadHash(Value v) {
    return hash(
        encode(
                List.of(
                    v.date().toString(),
                    v.category(),
                    v.description(),
                    v.amount().toPlainString(),
                    v.currency(),
                    v.type().name(),
                    v.refundOf()))
            .getBytes(StandardCharsets.UTF_8));
  }

  public String encode(Object value) {
    try {
      return json.writeValueAsString(value);
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot encode provenance");
    }
  }
}
