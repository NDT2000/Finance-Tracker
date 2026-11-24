import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import ChartCard from '../../components/ui/ChartCard';
import { EmptyState } from '../../components/ui/States';
import { useChartColors } from '../../useTheme';
import { formatMoney } from '../../format';
import { percentOf, toMinorUnits, fromMinorUnits } from '../../money';

const MAX_SLICES = 5;

// Whole percentages, but a small non-zero share reads "<1%" rather than a misleading "0%"
function shareLabel(amount, total, digits) {
    const percent = percentOf(amount, total, digits);
    return percent === 0 && toMinorUnits(amount, digits) > 0n ? '<1%' : `${percent}%`;
}

// Net spending per category as a donut: the five largest categories, the rest grouped as "Other".
// Categories whose refunds cancel their spending (net zero or less) are left out of the drawing.
export default function CategoryDonut({ byCategory, currency, digits, periodLabel }) {
    const chartColors = useChartColors();
    const sliceColors = [chartColors.royalBlue, chartColors.emerald, chartColors.teal, chartColors.purple, chartColors.amber, chartColors.slate];
    const positive = byCategory
        .filter(c => toMinorUnits(c.amount, digits) > 0n)
        .sort((a, b) => (toMinorUnits(b.amount, digits) > toMinorUnits(a.amount, digits) ? 1 : -1));

    // Grouping a single leftover category as "Other" would only hide its name, so it is shown instead
    const visible = positive.length === MAX_SLICES + 1 ? MAX_SLICES + 1 : MAX_SLICES;
    const top = positive.slice(0, visible);
    const rest = positive.slice(visible);
    const slices = top.map((c, i) => ({ name: c.category, amount: c.amount, color: sliceColors[i] }));
    if (rest.length) {
        const otherUnits = rest.reduce((sum, c) => sum + toMinorUnits(c.amount, digits), 0n);
        slices.push({ name: `Other (${rest.length})`, amount: fromMinorUnits(otherUnits, digits), color: chartColors.slate });
    }
    // The drawing needs numbers; the legend and tooltip keep showing the exact decimal strings.
    const chartData = slices.map(s => ({ ...s, value: Number(s.amount) }));
    const totalShown = fromMinorUnits(slices.reduce((sum, s) => sum + toMinorUnits(s.amount, digits), 0n), digits);
    const money = (value) => formatMoney(value, currency);

    if (!slices.length) {
        return (
            <ChartCard title="Spending by category" description={periodLabel}>
                <EmptyState icon={PieIcon} title="No spending to show" message="Expenses for this month will appear here by category." />
            </ChartCard>
        );
    }

    const largest = slices[0];
    const summary = `Spending by category for ${periodLabel}. Largest is ${largest.name} at ${money(largest.amount)}, `
        + `${shareLabel(largest.amount, totalShown, digits)} of ${money(totalShown)}. ${slices.length} categories shown.`;

    return (
        <ChartCard title="Spending by category" description={periodLabel} summary={summary}>
            <div className="donut">
                <div className="donut__chart">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={1} stroke="none">
                                {chartData.map(s => <Cell key={s.name} fill={s.color} />)}
                            </Pie>
                            <Tooltip formatter={(_, __, item) => money(item.payload.amount)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <ul className="donut__legend">
                    {slices.map(s => (
                        <li key={s.name}>
                            <span className="donut__swatch" style={{ background: s.color }} aria-hidden="true" />
                            <span className="donut__name">{s.name}</span>
                            <span className="donut__amount num">{money(s.amount)}</span>
                            <span className="donut__share num">{shareLabel(s.amount, totalShown, digits)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </ChartCard>
    );
}
