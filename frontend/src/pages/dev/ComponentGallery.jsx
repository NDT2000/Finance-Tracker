// Development-only gallery of the shared components (route /dev/components, excluded from production
// builds). Every figure here is a made-up sample for reviewing the components, never real data.
import { useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleCheck, Clock, Sparkles, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MonthSelector from '../../components/ui/MonthSelector';
import CurrencySelector from '../../components/ui/CurrencySelector';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/States';
import { chartColors } from '../../chartColors';
import { currentMonth, formatAxisMoney, formatMoney, formatMonth } from '../../format';
import './ComponentGallery.css';

const sampleCurrencies = [{ code: 'USD', digits: 2 }, { code: 'EUR', digits: 2 }, { code: 'JPY', digits: 0 }];
const sampleCategories = [
    { category: 'Housing', spent: 1450 }, { category: 'Food', spent: 335.95 },
    { category: 'Transport', spent: 95 }, { category: 'Utilities', spent: 72.3 },
];

function Section({ title, children }) {
    return (
        <section className="gallery__section">
            <h2>{title}</h2>
            {children}
        </section>
    );
}

export default function ComponentGallery() {
    const [month, setMonth] = useState(currentMonth());
    const [currency, setCurrency] = useState('USD');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState('');
    const money = (value) => formatMoney(value, currency);

    function confirmDelete() {
        setBusy(true);
        setTimeout(() => { setBusy(false); setDialogOpen(false); setResult('Confirmed (nothing was deleted: this is the gallery).'); }, 800);
    }

    return (
        <main className="gallery">
            <header className="gallery__intro">
                <Badge tone="info">Development only</Badge>
                <h1>Component gallery</h1>
                <p>Shared components from step 1.2 of the UI rebuild. All figures are samples.</p>
            </header>

            <Section title="Buttons">
                <div className="gallery__row">
                    <button type="button" className="btn btn--primary">Save transaction</button>
                    <button type="button" className="btn btn--secondary">Cancel</button>
                    <button type="button" className="btn btn--ghost">View history</button>
                    <button type="button" className="btn btn--danger">Delete scenario</button>
                    <button type="button" className="btn btn--primary" disabled>Saving…</button>
                </div>
            </Section>

            <Section title="Month and currency selectors">
                <div className="gallery__filters">
                    <MonthSelector value={month} onChange={setMonth} />
                    <CurrencySelector value={currency} onChange={setCurrency} currencies={sampleCurrencies} />
                </div>
                <p className="gallery__note">Selected: {month}, {currency}. Values below are formatted in the selected currency.</p>
            </Section>

            <Section title="Stat cards">
                <div className="gallery__grid">
                    <StatCard featured tone="positive" icon={Wallet} label="Monthly net cash flow"
                        value={formatMoney('2840.61', currency, { signed: true })} hint="Income minus net expenses. Not an account balance." />
                    <StatCard tone="positive" icon={TrendingUp} label="Total income" value={money('4850')} />
                    <StatCard label="Net expenses" value={money('2009.39')} hint="After refunds" />
                    <StatCard tone="warning" label="Food forecast" value={`Over by ${money('133.82')}`} hint="Estimate for month end" />
                    <StatCard featured tone="negative" label="Monthly net cash flow"
                        value={formatMoney('-412.08', currency, { signed: true })} hint="Spending exceeded income this month." />
                </div>
            </Section>

            <Section title="Badges">
                <div className="gallery__row">
                    <Badge tone="success" icon={CircleCheck}>Completed</Badge>
                    <Badge tone="danger" icon={TriangleAlert}>Failed</Badge>
                    <Badge tone="warning">Over budget (projected)</Badge>
                    <Badge tone="info">Imported</Badge>
                    <Badge tone="pending" icon={Clock}>Processing</Badge>
                    <Badge tone="ai" icon={Sparkles}>AI (future)</Badge>
                </div>
            </Section>

            <Section title="Chart card">
                <ChartCard title="Spending by category" description={`${formatMonth(month)} · ${currency} · sample data`}
                    summary="Bar chart of sample spending: Housing is the largest category, followed by Food, Transport and Utilities.">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={sampleCategories}>
                            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatAxisMoney(v, currency)} width={56} />
                            <Tooltip formatter={(v) => money(v)} />
                            <Bar dataKey="spent" name="Net spending" fill={chartColors.royalBlue} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </Section>

            <Section title="Empty, error and loading states">
                <div className="gallery__grid">
                    <div className="card"><EmptyState title="No transactions this month"
                        message="Add a transaction or import a CSV to see your spending here."
                        action={<button type="button" className="btn btn--primary">Add transaction</button>} /></div>
                    <div className="card"><ErrorState message="Your dashboard could not be loaded." onRetry={() => {}} /></div>
                    <div className="card"><LoadingSkeleton variant="stat" /></div>
                    <div className="card"><LoadingSkeleton variant="text" lines={3} /></div>
                    <div className="card"><LoadingSkeleton variant="chart" /></div>
                </div>
            </Section>

            <Section title="Confirm dialog">
                <div className="gallery__row">
                    <button type="button" className="btn btn--danger" onClick={() => { setResult(''); setDialogOpen(true); }}>Delete scenario…</button>
                    {result && <p role="status" className="gallery__note">{result}</p>}
                </div>
                <ConfirmDialog open={dialogOpen} busy={busy} title="Delete this scenario?"
                    message="“Move to a bigger flat” and its 6 events will be permanently deleted. Your actual transactions are not affected."
                    confirmLabel="Delete scenario" onConfirm={confirmDelete} onCancel={() => setDialogOpen(false)} />
            </Section>
        </main>
    );
}
