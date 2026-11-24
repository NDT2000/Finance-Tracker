import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleCheck, Landmark, OctagonAlert, PiggyBank, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import Badge from '../../components/ui/Badge';
import { chartColors } from '../../chartColors';
import { formatAxisMoney, formatMoney } from '../../format';
import { finalCombinedValue, fundingChecks, shortMonth } from './planningRules';

const checkIcons = { danger: OctagonAlert, warning: TriangleAlert, success: CircleCheck };

// Headline results at the end of the horizon, exactly as the backend projected them
export function ResultsSummary({ projection, plan }) {
    const money = (value) => formatMoney(value, plan.currency);
    const endMonth = projection.months.at(-1)?.month;
    const end = endMonth ? shortMonth(endMonth) : '';
    return (
        <div className="plan-summary">
            <StatCard featured icon={Wallet} label={`Projected cash, ${end}`} value={money(projection.closingCash)}
                tone={Number(projection.closingCash) < 0 ? 'negative' : 'neutral'} />
            <StatCard icon={TrendingUp} label={`Projected investments, ${end}`} value={money(projection.closingInvestments)}
                hint={Number(projection.totalInvestmentGrowth) !== 0 ? `Includes ${money(projection.totalInvestmentGrowth)} assumed growth` : undefined} />
            <StatCard icon={PiggyBank} label="Cash and investments combined" value={money(finalCombinedValue(projection))} />
            <StatCard icon={Landmark} label="Lowest cash" value={money(projection.minimumCash)}
                tone={Number(projection.minimumCash) < 0 ? 'negative' : Number(projection.minimumCash) < Number(plan.cashReserve) ? 'warning' : 'neutral'}
                hint={`Reserve ${money(plan.cashReserve)}`} />
        </div>
    );
}

export function FundingChecks({ projection, plan }) {
    const checks = fundingChecks(projection);
    return (
        <section className="card" aria-labelledby="funding-title">
            <h2 className="card__title" id="funding-title">Funding checks</h2>
            <ul className="funding-list">
                {checks.map(check => {
                    const Icon = checkIcons[check.tone];
                    return (
                        <li key={check.title} className={`funding-check funding-check--${check.tone}`}>
                            <Icon size={18} aria-hidden="true" />
                            <div>
                                <p className="funding-check__title">
                                    {check.title}{check.amount && <>: {formatMoney(check.amount, plan.currency)}</>}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

// Cash and investments per month. Different colours AND line styles (solid vs dashed, round vs square
// points) so the two series are distinguishable without colour; the reserve is a labelled dashed line.
export function ProjectionChart({ projection, plan }) {
    const money = (value) => formatMoney(value, plan.currency);
    const data = projection.months.map(row => ({
        label: shortMonth(row.month), cash: Number(row.closingCash), investments: Number(row.closingInvestments),
        cashText: row.closingCash, investmentsText: row.closingInvestments,
    }));
    const reserve = Number(plan.cashReserve);
    const summary = `Projected month-end cash and investments over ${data.length} months. Cash ends at ${money(projection.closingCash)}, `
        + `investments at ${money(projection.closingInvestments)}; the lowest cash, including the opening amount, is ${money(projection.minimumCash)}.`;
    return (
        <ChartCard title="Projected cash and investments" summary={summary}>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartColors.axisText }} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={{ fontSize: 12, fill: chartColors.axisText }} axisLine={false} tickLine={false} width={64}
                        tickFormatter={(v) => formatAxisMoney(v, plan.currency)} />
                    <Tooltip formatter={(_, name, item) => [money(name === 'Cash' ? item.payload.cashText : item.payload.investmentsText), name]} />
                    <Legend />
                    {reserve > 0 && (
                        <ReferenceLine y={reserve} stroke={chartColors.amber} strokeDasharray="6 4"
                            label={{ value: 'Reserve', position: 'insideTopRight', fill: chartColors.axisText, fontSize: 12 }} />
                    )}
                    <ReferenceLine y={0} stroke={chartColors.axisText} />
                    <Line dataKey="cash" name="Cash" stroke={chartColors.royalBlue} strokeWidth={2} dot={{ r: 3 }} />
                    <Line dataKey="investments" name="Investments" stroke={chartColors.emerald} strokeWidth={2} strokeDasharray="6 3"
                        dot={{ r: 3, shape: 'square' }} legendType="plainline" />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

const COLUMNS = [
    ['income', 'Income'], ['spending', 'Spending'], ['loanRepayments', 'Loan payments'],
    ['investmentContributions', 'Invested'], ['fundedWithdrawals', 'Withdrawn'], ['unfundedWithdrawals', 'Unfunded'],
    ['investmentGrowth', 'Growth'], ['closingCash', 'Cash'], ['closingInvestments', 'Investments'],
];

// Every month in detail, for exact figures (spec: tables for exact financial calculations)
export function ProjectionTable({ projection, plan }) {
    return (
        <section className="card" aria-labelledby="projection-table-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="projection-table-title">Monthly projection</h2>
                </div>
            </div>
            <div className="plan-table">
                <table>
                    <thead>
                        <tr><th scope="col">Month</th>{COLUMNS.map(([key, label]) => <th scope="col" key={key} className="plan-table__num">{label}</th>)}</tr>
                    </thead>
                    <tbody>
                        {projection.months.map(row => (
                            <tr key={row.month}>
                                <th scope="row">
                                    {shortMonth(row.month)}
                                    {row.cashShortfall && <Badge tone="danger">Shortfall</Badge>}
                                    {!row.cashShortfall && row.belowReserve && <Badge tone="warning">Below reserve</Badge>}
                                </th>
                                {COLUMNS.map(([key]) => (
                                    <td key={key} className={`plan-table__num num${key === 'closingCash' && row.cashShortfall ? ' plan-table__negative' : ''}`}>
                                        {formatMoney(row[key], plan.currency)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
