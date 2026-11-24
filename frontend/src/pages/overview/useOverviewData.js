import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

// The month the backend forecasts: ForecastService uses the current month in UTC. Comparing with a
// local-time month would request forecasts for the wrong month near month boundaries.
const forecastMonth = () => new Date().toISOString().slice(0, 7);

// Loads everything the overview shows for one month and currency.
// Forecasts load separately afterwards, so a slow or unavailable ML service never delays or breaks
// the rest of the page. Responses for an older month/currency are ignored if the user has moved on.
// State is only set after a request resolves; "loading" and stale forecasts are derived from which
// month and currency the data belongs to.
export default function useOverviewData(month, currency) {
    const key = `${month}|${currency}`;
    const [state, setState] = useState({ summary: null, transactions: [], budgets: [], loadedFor: '', refreshing: false, error: '' });
    const [forecasts, setForecasts] = useState({ for: '', byCategory: {} });
    const latestRequest = useRef(0);

    const load = useCallback(async () => {
        const request = ++latestRequest.current;
        const isCurrent = () => request === latestRequest.current;
        const loadedFor = `${month}|${currency}`;
        try {
            const period = `month=${encodeURIComponent(month)}&currency=${encodeURIComponent(currency)}`;
            const [summary, transactions, budgets] = await Promise.all([
                api.get(`/api/analytics/monthly?${period}`),
                api.get(`/api/transactions?${period}`),
                api.get('/api/budgets'),
            ]);
            if (!isCurrent()) return;
            const [year, monthNumber] = month.split('-').map(Number);
            const monthBudgets = budgets.data.filter(b => b.currency === currency && b.year === year && b.month === monthNumber);
            setState({ summary: summary.data, transactions: transactions.data, budgets: monthBudgets, loadedFor, refreshing: false, error: '' });

            if (month !== forecastMonth()) return;
            // One forecast per budgeted category; a failure marks only that category as unavailable.
            setForecasts({ for: loadedFor, byCategory: Object.fromEntries(monthBudgets.map(b => [b.category, { loading: true }])) });
            const results = await Promise.all(monthBudgets.map(async b => {
                try {
                    const { data } = await api.get(`/api/forecast/${encodeURIComponent(b.category)}`, {
                        params: { budgetLimit: b.monthlyLimit, currency },
                    });
                    return [b.category, { data }];
                } catch {
                    return [b.category, { unavailable: true }];
                }
            }));
            if (isCurrent()) setForecasts({ for: loadedFor, byCategory: Object.fromEntries(results) });
        } catch {
            if (isCurrent()) setState(previous => ({ ...previous, refreshing: false, error: 'Your overview could not be loaded.' }));
        }
    }, [month, currency]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API; state is set only after the requests resolve
    useEffect(() => { load(); }, [load]);

    // Called from the Refresh button and after saving, so marking "refreshing" here is an event, not an effect
    const reload = useCallback(() => {
        setState(previous => ({ ...previous, refreshing: true }));
        return load();
    }, [load]);

    const { loadedFor, refreshing, ...data } = state;
    return {
        ...data,
        loading: refreshing || loadedFor !== key,
        forecasts: forecasts.for === key ? forecasts.byCategory : {},
        reload,
    };
}
