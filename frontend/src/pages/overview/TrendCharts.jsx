import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../../components/ui/ChartCard';
import { useChartColors } from '../../useTheme';
import { formatAxisMoney, formatMoney } from '../../format';

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Income against net expenses for the month, as two labelled bars.
export function IncomeExpenseChart({ income, netExpenses, currency, periodLabel }) {
    const chartColors = useChartColors();
    const axisTick = { fontSize: 12, fill: chartColors.axisText };
    const data = [
        { name: 'Income', amount: income, value: Number(income), color: chartColors.emerald },
        { name: 'Net expenses', amount: netExpenses, value: Number(netExpenses), color: chartColors.royalBlue },
    ];
    const summary = `For ${periodLabel}: income ${formatMoney(income, currency)}, net expenses ${formatMoney(netExpenses, currency)}.`;
    return (
        <ChartCard title="Income vs expenses" description={periodLabel} summary={summary}>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatAxisMoney(v, currency)} />
                    <Tooltip cursor={{ fill: chartColors.hover }} formatter={(_, __, item) => [formatMoney(item.payload.amount, currency), item.payload.name]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72}>
                        {data.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

// Net spending per day (expenses minus refunds). Days without entries are not drawn as zero.
export function DailySpendingChart({ byDay, currency, periodLabel }) {
    const chartColors = useChartColors();
    const axisTick = { fontSize: 12, fill: chartColors.axisText };
    const data = byDay.map(d => ({ date: d.date, amount: d.amount, value: Number(d.amount) }));
    if (!data.length) return null;
    const highest = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);
    const summary = `Daily net spending for ${periodLabel} across ${data.length} days with entries. `
        + `Highest was ${formatMoney(highest.amount, currency)} on ${shortDate(highest.date)}.`;
    return (
        <ChartCard title="Daily net spending" description={periodLabel} summary={summary}>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortDate} minTickGap={24} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatAxisMoney(v, currency)} />
                    <Tooltip labelFormatter={shortDate} formatter={(_, __, item) => [formatMoney(item.payload.amount, currency), 'Net spending']} />
                    <Line dataKey="value" stroke={chartColors.royalBlue} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
