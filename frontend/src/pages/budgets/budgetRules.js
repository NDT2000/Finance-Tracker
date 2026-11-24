// Budget calculations shared by the Budgets page and the overview's budget card. Plain functions so
// they can be unit-tested. Money stays exact (money.js); only bar widths use ordinary numbers.
import { fromMinorUnits, percentOf, subtractMoney, toMinorUnits } from '../../money.js';

// Net spending recorded for a category this month (expenses minus refunds), or "0"
export function spentFor(byCategory, category) {
    return byCategory.find(c => c.category === category)?.amount ?? '0';
}

// Spec colours: red only for actual overspending; amber when 80%+ used or projected to go over.
export function budgetTone(percent, projectedOver = false) {
    if (percent !== null && percent > 100) return 'danger';
    if ((percent !== null && percent >= 80) || projectedOver) return 'warning';
    return 'normal';
}

// Everything a budget card shows about actual spending. remaining is negative when over.
export function budgetStatus(budget, spent, digits = 2) {
    const remaining = subtractMoney(budget.monthlyLimit, spent, digits);
    const percent = percentOf(spent, budget.monthlyLimit, digits);
    return { spent, remaining, percent, over: toMinorUnits(remaining, digits) < 0n };
}

// Reads one entry of the forecasts map ({ loading } | { unavailable } | { data }) into display terms.
// The ML service returns floating-point estimates; they are shown as estimates, never as ledger totals.
export function forecastView(forecast) {
    if (!forecast) return { state: 'none' };
    if (forecast.loading) return { state: 'loading' };
    if (forecast.unavailable || !forecast.data) return { state: 'unavailable' };
    const { data } = forecast;
    return {
        state: 'ready',
        onTrack: data.status === 'ON_TRACK',
        predicted: data.predicted_month_end_total,
        overBy: data.overspend_amount,
        confidence: data.confidence ? data.confidence.toLowerCase() : null,
    };
}

// Bar geometry as percentages of the longest of limit, spent and predicted, so all three fit:
// spent = solid actual segment, projected = striped segment from spent up to the prediction,
// limit = position of the limit marker.
export function barSegments(limit, spent, predicted = null) {
    const values = [Number(limit), Number(spent), predicted === null ? 0 : Number(predicted)].map(v => Math.max(v, 0));
    const scale = Math.max(...values) || 1;
    const [limitValue, spentValue, predictedValue] = values;
    const pct = (v) => Math.round((v / scale) * 1000) / 10;
    return {
        spent: pct(spentValue),
        projected: predicted === null ? 0 : pct(Math.max(predictedValue - spentValue, 0)),
        limit: pct(limitValue),
    };
}

// Totals across the month's budgets, exact. spent counts only budgeted categories.
export function budgetTotals(budgets, byCategory, digits = 2) {
    let budgeted = 0n;
    let spent = 0n;
    let overCount = 0;
    for (const b of budgets) {
        const categorySpent = toMinorUnits(spentFor(byCategory, b.category), digits);
        const limit = toMinorUnits(b.monthlyLimit, digits);
        budgeted += limit;
        spent += categorySpent;
        if (categorySpent > limit) overCount += 1;
    }
    return {
        budgeted: fromMinorUnits(budgeted, digits),
        spent: fromMinorUnits(spent, digits),
        remaining: fromMinorUnits(budgeted - spent, digits),
        overCount,
    };
}

// Categories with positive net spending this month but no budget, largest first.
export function unbudgetedSpending(byCategory, budgets, digits = 2) {
    const budgeted = new Set(budgets.map(b => b.category));
    return byCategory
        .filter(c => !budgeted.has(c.category) && toMinorUnits(c.amount, digits) > 0n)
        .sort((a, b) => {
            const difference = toMinorUnits(b.amount, digits) - toMinorUnits(a.amount, digits);
            return difference > 0n ? 1 : difference < 0n ? -1 : a.category.localeCompare(b.category);
        });
}
