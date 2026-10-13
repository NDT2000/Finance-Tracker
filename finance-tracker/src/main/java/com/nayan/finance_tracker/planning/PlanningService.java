package com.nayan.finance_tracker.planning;

import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.exception.*;
import com.nayan.finance_tracker.pipeline.*;
import com.nayan.finance_tracker.repository.UserRepository;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
@Transactional
public class PlanningService {
  private final PlanRepository plans;
  private final EventRepository events;
  private final UserRepository users;
  private final CurrencyRules currencies;
  private final AnalyticsService analytics;

  private User lock(User u) {
    return users
        .lockById(u.getId())
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private FinancialPlan owned(UUID id, User u) {
    return plans
        .findByIdAndUser(id, u)
        .orElseThrow(() -> new ResourceNotFoundException("Plan not found"));
  }

  public static YearMonth month(String value) {
    if (value == null || !value.matches("[0-9]{4}-(0[1-9]|1[0-2])") || value.startsWith("0000"))
      throw new IllegalArgumentException("Month must use YYYY-MM with a valid year and month");
    return YearMonth.parse(value);
  }

  private BigDecimal money(BigDecimal amount, String currency, boolean negativeAllowed) {
    if (amount == null
        || (!negativeAllowed && amount.signum() < 0)
        || amount.abs().compareTo(new BigDecimal("1000000000000000")) >= 0)
      throw new IllegalArgumentException("Money must be within the supported range");
    try {
      return amount.setScale(
          java.util.Currency.getInstance(currency).getDefaultFractionDigits(),
          RoundingMode.UNNECESSARY);
    } catch (ArithmeticException ex) {
      throw new IllegalArgumentException("Amount has too many currency decimal places");
    }
  }

  private void assign(FinancialPlan p, PlanRequest r) {
    String currency = currencies.code(r.currency());
    YearMonth start = month(r.startMonth());
    if (r.months() < 1 || r.months() > 36 || start.plusMonths(r.months() - 1).getYear() > 9999)
      throw new IllegalArgumentException("Plan must contain 1–36 valid calendar months");
    p.setName(r.name().strip());
    p.setCurrency(currency);
    p.setStartMonth(r.startMonth());
    p.setMonths(r.months());
    p.setOpeningCash(money(r.openingCash(), currency, true));
    p.setOpeningInvestments(money(r.openingInvestments(), currency, false));
    p.setCashReserve(money(r.cashReserve(), currency, false));
    p.setAnnualReturnPercent(r.annualReturnPercent());
  }

  @Transactional(readOnly = true)
  public List<PlanResponse> list(User u) {
    return plans.findByUserOrderByNameAscIdAsc(u).stream().map(PlanResponse::from).toList();
  }

  @Transactional(readOnly = true)
  public PlanResponse get(UUID id, User u) {
    return PlanResponse.from(owned(id, u));
  }

  public PlanResponse create(PlanRequest r, User u) {
    u = lock(u);
    var p = new FinancialPlan();
    p.setUser(u);
    assign(p, r);
    return PlanResponse.from(plans.saveAndFlush(p));
  }

  public PlanResponse update(UUID id, PlanRequest r, User u) {
    u = lock(u);
    var p = owned(id, u);
    var rows = events.findByPlanOrderByFirstMonthAscIdAsc(p);
    if (!rows.isEmpty() && !p.getCurrency().equals(r.currency()))
      throw new DuplicateResourceException(
          "Create a separate currency plan instead of relabelling existing events");
    if (rows.stream().anyMatch(e -> e.getLastMonth() > r.months()))
      throw new DuplicateResourceException(
          "Adjust events outside the new horizon before shortening the plan");
    assign(p, r);
    return PlanResponse.from(plans.saveAndFlush(p));
  }

  public void delete(UUID id, User u) {
    u = lock(u);
    var p = owned(id, u);
    events.deleteByPlan(p);
    plans.delete(p);
  }

  public PlanResponse copy(UUID id, User u) {
    u = lock(u);
    var original = owned(id, u);
    var p = new FinancialPlan();
    p.setUser(u);
    p.setName(
        original.getName().substring(0, Math.min(93, original.getName().length())) + " (copy)");
    p.setCurrency(original.getCurrency());
    p.setStartMonth(original.getStartMonth());
    p.setMonths(original.getMonths());
    p.setOpeningCash(original.getOpeningCash());
    p.setOpeningInvestments(original.getOpeningInvestments());
    p.setCashReserve(original.getCashReserve());
    p.setAnnualReturnPercent(original.getAnnualReturnPercent());
    plans.saveAndFlush(p);
    for (var source : events.findByPlanOrderByFirstMonthAscIdAsc(original)) {
      var e = new PlanEvent();
      e.setPlan(p);
      e.setName(source.getName());
      e.setKind(source.getKind());
      e.setRecurrence(source.getRecurrence());
      e.setAmount(source.getAmount());
      e.setFirstMonth(source.getFirstMonth());
      e.setLastMonth(source.getLastMonth());
      events.save(e);
    }
    return PlanResponse.from(p);
  }

  @Transactional(readOnly = true)
  public List<EventResponse> listEvents(UUID id, User u) {
    return events.findByPlanOrderByFirstMonthAscIdAsc(owned(id, u)).stream()
        .map(EventResponse::from)
        .toList();
  }

  private void assignEvent(PlanEvent e, FinancialPlan p, EventRequest r) {
    if (r.firstMonth() < 1 || r.lastMonth() < r.firstMonth() || r.lastMonth() > p.getMonths())
      throw new IllegalArgumentException("Event months must fall within the plan horizon");
    if (r.recurrence() == PlanEvent.Recurrence.ONCE && r.firstMonth() != r.lastMonth())
      throw new IllegalArgumentException("A one-time event must use one month");
    e.setPlan(p);
    e.setName(r.name().strip());
    e.setKind(r.kind());
    e.setRecurrence(r.recurrence());
    e.setAmount(currencies.amount(r.amount(), p.getCurrency()));
    e.setFirstMonth(r.firstMonth());
    e.setLastMonth(r.lastMonth());
  }

  public EventResponse addEvent(UUID id, EventRequest r, User u) {
    u = lock(u);
    var p = owned(id, u);
    if (events.countByPlan(p) >= 200)
      throw new DuplicateResourceException("A plan supports at most 200 events");
    var e = new PlanEvent();
    assignEvent(e, p, r);
    return EventResponse.from(events.saveAndFlush(e));
  }

  public EventResponse updateEvent(UUID id, UUID eventId, EventRequest r, User u) {
    u = lock(u);
    var p = owned(id, u);
    var e =
        events
            .findByIdAndPlan(eventId, p)
            .orElseThrow(() -> new ResourceNotFoundException("Planned event not found"));
    assignEvent(e, p, r);
    return EventResponse.from(events.saveAndFlush(e));
  }

  public void deleteEvent(UUID id, UUID eventId, User u) {
    u = lock(u);
    var p = owned(id, u);
    var e =
        events
            .findByIdAndPlan(eventId, p)
            .orElseThrow(() -> new ResourceNotFoundException("Planned event not found"));
    events.delete(e);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Map<String, Object> project(UUID id, String baselineMonth, User u) {
    var p = owned(id, u);
    var rows = events.findByPlanOrderByFirstMonthAscIdAsc(p);
    int scale = java.util.Currency.getInstance(p.getCurrency()).getDefaultFractionDigits();
    BigDecimal cash = p.getOpeningCash(),
        invested = p.getOpeningInvestments(),
        minimumCash = cash,
        totalGrowth = BigDecimal.ZERO,
        totalUnfunded = BigDecimal.ZERO;
    BigDecimal rate =
        p.getAnnualReturnPercent().divide(new BigDecimal("1200"), MathContext.DECIMAL128);
    var months = new ArrayList<Map<String, Object>>();
    String firstShortfall = null, firstReserveGap = null;
    YearMonth start = month(p.getStartMonth());
    for (int offset = 1; offset <= p.getMonths(); offset++) {
      BigDecimal income = BigDecimal.ZERO,
          spending = BigDecimal.ZERO,
          contributions = BigDecimal.ZERO,
          loans = BigDecimal.ZERO,
          requested = BigDecimal.ZERO;
      for (var e : rows)
        if (offset >= e.getFirstMonth() && offset <= e.getLastMonth()) {
          switch (e.getKind()) {
            case INCOME -> income = income.add(e.getAmount());
            case EXPENSE -> spending = spending.add(e.getAmount());
            case INVESTMENT -> contributions = contributions.add(e.getAmount());
            case LOAN_REPAYMENT -> loans = loans.add(e.getAmount());
            case WITHDRAWAL -> requested = requested.add(e.getAmount());
          }
        }
      String label = start.plusMonths(offset - 1).toString();
      BigDecimal opening = cash,
          available = invested.add(contributions),
          funded = requested.min(available),
          unfunded = requested.subtract(funded);
      invested = available.subtract(funded);
      BigDecimal growth =
          invested.multiply(rate, MathContext.DECIMAL128).setScale(scale, RoundingMode.HALF_EVEN);
      invested = invested.add(growth);
      cash =
          cash.add(income)
              .add(funded)
              .subtract(spending)
              .subtract(loans)
              .subtract(contributions)
              .setScale(scale, RoundingMode.HALF_EVEN);
      minimumCash = minimumCash.min(cash);
      totalGrowth = totalGrowth.add(growth);
      totalUnfunded = totalUnfunded.add(unfunded);
      if (cash.signum() < 0 && firstShortfall == null) firstShortfall = label;
      if (cash.compareTo(p.getCashReserve()) < 0 && firstReserveGap == null)
        firstReserveGap = label;
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("month", label);
      row.put("openingCash", opening.toPlainString());
      row.put("income", income.toPlainString());
      row.put("spending", spending.toPlainString());
      row.put("loanRepayments", loans.toPlainString());
      row.put("investmentContributions", contributions.toPlainString());
      row.put("requestedWithdrawals", requested.toPlainString());
      row.put("fundedWithdrawals", funded.toPlainString());
      row.put("unfundedWithdrawals", unfunded.toPlainString());
      row.put("investmentGrowth", growth.toPlainString());
      row.put("closingCash", cash.toPlainString());
      row.put("closingInvestments", invested.toPlainString());
      row.put("cashAndInvestments", cash.add(invested).toPlainString());
      row.put("belowReserve", cash.compareTo(p.getCashReserve()) < 0);
      row.put("cashShortfall", cash.signum() < 0);
      months.add(row);
    }
    YearMonth baseline =
        baselineMonth == null ? YearMonth.now(ZoneOffset.UTC).minusMonths(1) : month(baselineMonth);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("plan", PlanResponse.from(p));
    result.put("months", months);
    result.put("closingCash", cash.toPlainString());
    result.put("closingInvestments", invested.toPlainString());
    result.put("minimumCash", minimumCash.toPlainString());
    result.put("totalInvestmentGrowth", totalGrowth.toPlainString());
    result.put("totalUnfundedWithdrawals", totalUnfunded.toPlainString());
    result.put("firstCashShortfall", firstShortfall);
    result.put("firstBelowReserve", firstReserveGap);
    result.put("actualBaseline", analytics.summary(u.getId(), baseline, p.getCurrency()));
    result.put("asOf", Instant.now().toString());
    return result;
  }
}
