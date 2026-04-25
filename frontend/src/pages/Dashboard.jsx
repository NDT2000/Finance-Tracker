import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Dashboard() {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);

    // Add transaction form state
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
    });

    const categories = ['Food', 'Transport', 'Rent', 
                        'Entertainment', 'Health', 'Other'];

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            const [txnRes, budgetRes] = await Promise.all([
                api.get('/api/transactions'),
                api.get('/api/budgets'),
            ]);
            setTransactions(txnRes.data);
            setBudgets(budgetRes.data);

            // Get forecast for Food category if budget exists
            const foodBudget = budgetRes.data.find(
                b => b.category === 'Food'
            );
            if (foodBudget) {
                const forecastRes = await api.get(
                    `/api/forecast/Food?budgetLimit=${foodBudget.monthlyLimit}`
                );
                setForecast(forecastRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/transactions', {
                ...form,
                amount: parseFloat(form.amount),
            });
            setShowForm(false);
            setForm({
                description: '',
                amount: '',
                type: 'EXPENSE',
                category: 'Food',
                date: new Date().toISOString().split('T')[0],
            });
            fetchData(); // refresh data
        } catch (err) {
            console.error('Failed to add transaction:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- Chart data preparation ---

    // Spending by category (bar chart)
    const spendingByCategory = categories.map(cat => ({
        category: cat,
        spent: transactions
            .filter(t => t.category === cat && t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0),
    })).filter(d => d.spent > 0);

    // Spending vs budget (grouped bar)
    const spendingVsBudget = budgets.map(b => ({
        category: b.category,
        budget: parseFloat(b.monthlyLimit),
        spent: transactions
            .filter(t => t.category === b.category && t.type === 'EXPENSE')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    }));

    // Daily spending trend (line chart)
    const dailyTrend = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => {
            const day = new Date(t.date).getDate();
            acc[day] = (acc[day] || 0) + parseFloat(t.amount);
            return acc;
        }, {});

    const dailyData = Object.entries(dailyTrend)
        .map(([day, amount]) => ({ day: parseInt(day), amount }))
        .sort((a, b) => a.day - b.day);

    // Income vs expense (pie chart)
    const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const pieData = [
        { name: 'Income', value: totalIncome },
        { name: 'Expense', value: totalExpense },
    ].filter(d => d.value > 0);

    if (loading) return (
        <div style={styles.loading}>Loading your dashboard...</div>
    );

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>
                    Finance Tracker
                </h1>
                <div style={styles.headerRight}>
                    <span style={styles.userName}>
                        Hi, {user?.fullName}
                    </span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            <div style={styles.content}>
                {/* Summary cards */}
                <div style={styles.cardRow}>
                    <div style={styles.summaryCard}>
                        <p style={styles.cardLabel}>Total Income</p>
                        <p style={{...styles.cardValue, color: '#22c55e'}}>
                            ${totalIncome.toFixed(2)}
                        </p>
                    </div>
                    <div style={styles.summaryCard}>
                        <p style={styles.cardLabel}>Total Expenses</p>
                        <p style={{...styles.cardValue, color: '#ef4444'}}>
                            ${totalExpense.toFixed(2)}
                        </p>
                    </div>
                    <div style={styles.summaryCard}>
                        <p style={styles.cardLabel}>Net Savings</p>
                        <p style={{
                            ...styles.cardValue,
                            color: totalIncome - totalExpense >= 0
                                ? '#22c55e' : '#ef4444'
                        }}>
                            ${(totalIncome - totalExpense).toFixed(2)}
                        </p>
                    </div>
                    {forecast && (
                        <div style={{
                            ...styles.summaryCard,
                            backgroundColor: forecast.status === 'ON_TRACK'
                                ? '#f0fdf4' : '#fef2f2',
                        }}>
                            <p style={styles.cardLabel}>Food Forecast</p>
                            <p style={{
                                ...styles.cardValue,
                                color: forecast.status === 'ON_TRACK'
                                    ? '#22c55e' : '#ef4444',
                            }}>
                                {forecast.status === 'ON_TRACK'
                                    ? '✓ On track'
                                    : `⚠ Over by $${forecast.overspend_amount}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Add transaction button */}
                <button
                    style={styles.addBtn}
                    onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add Transaction'}
                </button>

                {/* Add transaction form */}
                {showForm && (
                    <form onSubmit={handleAddTransaction} style={styles.form}>
                        <input
                            style={styles.input}
                            placeholder="Description"
                            value={form.description}
                            onChange={e => setForm({
                                ...form, description: e.target.value
                            })}
                            required
                        />
                        <input
                            style={styles.input}
                            type="number"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={e => setForm({
                                ...form, amount: e.target.value
                            })}
                            required
                        />
                        <select
                            style={styles.input}
                            value={form.type}
                            onChange={e => setForm({
                                ...form, type: e.target.value
                            })}>
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                        </select>
                        <select
                            style={styles.input}
                            value={form.category}
                            onChange={e => setForm({
                                ...form, category: e.target.value
                            })}>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <input
                            style={styles.input}
                            type="date"
                            value={form.date}
                            onChange={e => setForm({
                                ...form, date: e.target.value
                            })}
                            required
                        />
                        <button type="submit" style={styles.submitBtn}>
                            Add Transaction
                        </button>
                    </form>
                )}

                {/* Charts grid */}
                <div style={styles.chartsGrid}>

                    {/* Spending by category */}
                    {spendingByCategory.length > 0 && (
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>
                                Spending by Category
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={spendingByCategory}>
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={v => [`$${v.toFixed(2)}`]}
                                    />
                                    <Bar
                                        dataKey="spent"
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Spending vs budget */}
                    {spendingVsBudget.length > 0 && (
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>
                                Spending vs Budget
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={spendingVsBudget}>
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={v => [`$${v.toFixed(2)}`]}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="spent"
                                        fill="#6366f1"
                                        name="Spent"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="budget"
                                        fill="#e2e8f0"
                                        name="Budget"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Daily spending trend */}
                    {dailyData.length > 0 && (
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>
                                Daily Spending Trend
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={dailyData}>
                                    <XAxis
                                        dataKey="day"
                                        label={{
                                            value: 'Day of month',
                                            position: 'insideBottom',
                                            offset: -5
                                        }}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        formatter={v => [`$${v.toFixed(2)}`]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="Daily spend"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Income vs expense pie */}
                    {pieData.length > 0 && (
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>
                                Income vs Expense
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({name, value}) =>
                                            `${name}: $${value.toFixed(0)}`
                                        }>
                                        {pieData.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={COLORS[i]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={v => [`$${v.toFixed(2)}`]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Recent transactions */}
                <div style={styles.tableCard}>
                    <h3 style={styles.chartTitle}>Recent Transactions</h3>
                    {transactions.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center' }}>
                            No transactions yet. Add one above.
                        </p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeader}>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Description</th>
                                    <th style={styles.th}>Category</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions
                                    .slice()
                                    .reverse()
                                    .slice(0, 10)
                                    .map(t => (
                                    <tr key={t.id} style={styles.tableRow}>
                                        <td style={styles.td}>{t.date}</td>
                                        <td style={styles.td}>
                                            {t.description}
                                        </td>
                                        <td style={styles.td}>{t.category}</td>
                                        <td style={styles.td}>
                                            <span style={{
                                                color: t.type === 'INCOME'
                                                    ? '#22c55e' : '#ef4444',
                                                fontWeight: 'bold',
                                            }}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td style={{
                                            ...styles.td,
                                            color: t.type === 'INCOME'
                                                ? '#22c55e' : '#ef4444',
                                            fontWeight: 'bold',
                                        }}>
                                            ${parseFloat(t.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', backgroundColor: '#f8f9fb' },
    header: {
        backgroundColor: '#1a1a2e',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { color: 'white', margin: 0 },
    headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    userName: { color: '#a5b4fc' },
    logoutBtn: {
        padding: '0.4rem 1rem',
        backgroundColor: 'transparent',
        border: '1px solid #6366f1',
        color: '#a5b4fc',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    content: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
    cardRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    summaryCard: {
        backgroundColor: 'white',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)',
    },
    cardLabel: {
        margin: 0,
        color: '#9ca3af',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    cardValue: {
        margin: '0.4rem 0 0',
        fontSize: '1.75rem',
        fontWeight: '700',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '-0.02em',
    },
    addBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer',
        marginBottom: '1rem',
    },
    form: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.75rem',
        backgroundColor: 'white',
        padding: '1.25rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    input: {
        padding: '0.6rem',
        borderRadius: '6px',
        border: '1px solid #ddd',
        fontSize: '0.9rem',
    },
    submitBtn: {
        padding: '0.6rem',
        backgroundColor: '#22c55e',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    chartCard: {
        backgroundColor: 'white',
        padding: '1.25rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    chartTitle: {
        margin: '0 0 1rem',
        color: '#1a1a2e',
        fontSize: '1rem',
    },
    tableCard: {
        backgroundColor: 'white',
        padding: '1.25rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { borderBottom: '2px solid #f0f0f0' },
    th: {
        padding: '0.75rem',
        textAlign: 'left',
        color: '#666',
        fontSize: '0.875rem',
    },
    tableRow: { borderBottom: '1px solid #f9f9f9' },
    td: { padding: '0.75rem', fontSize: '0.9rem' },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#666',
    },
};