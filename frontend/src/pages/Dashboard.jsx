import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import SummaryCards from '../components/SummaryCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

const Dashboard = ({ showToast }) => {
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: [] });
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  // Filters state
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setUserEmail(localStorage.getItem('userEmail') || 'User');
    fetchDashboardData();
  }, [filterType, filterCategory, filterMonth]);

  const fetchDashboardData = async () => {
    try {
      // Fetch summary (global totals)
      const summaryRes = await api.get('/transactions/summary');
      setSummary(summaryRes.data);

      // Fetch transactions with filters
      let query = '/transactions';
      const params = [];
      if (filterType) params.push(`type=${filterType}`);
      if (filterCategory) params.push(`category=${filterCategory}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (params.length > 0) {
        query += `?${params.join('&')}`;
      }
      
      const transactionsRes = await api.get(query);
      setTransactions(transactionsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        showToast('Error loading dashboard data', 'error');
      }
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      showToast('Transaction deleted successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete transaction', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const handleGetInsights = async () => {
    setLoadingInsights(true);
    setInsights('');
    try {
      const response = await api.get('/insights');
      setInsights(response.data.insights);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch AI insights', 'error');
      setInsights('### ⚠️ Service Temporarily Unavailable\n\nCould not fetch financial insights. Please configure a valid API key or try again later.');
    } finally {
      setLoadingInsights(false);
    }
  };

  // Process data for Area Chart: Spending & Income over time
  // Group transactions by date
  const getChartData = () => {
    if (transactions.length === 0) return [];
    
    // Sort transactions chronologically
    const sorted = [...transactions].reverse();
    const grouped = sorted.reduce((acc, curr) => {
      const dateStr = curr.date;
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, Income: 0, Expenses: 0 };
      }
      if (curr.type === 'income') {
        acc[dateStr].Income += parseFloat(curr.amount);
      } else {
        acc[dateStr].Expenses += parseFloat(curr.amount);
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const chartData = getChartData();

  // Pie chart colors
  const COLORS = ['#6366f1', '#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#f472b6', '#cbd5e1'];

  // Render markdown insights text safely/simply as custom HTML blocks
  const renderInsights = (text) => {
    if (!text) return null;
    
    // Simple markdown parsing helper for bullets/bolding/headers
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} style={{ color: 'var(--balance)', marginTop: '1rem', marginBottom: '0.5rem' }}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} style={{ color: 'var(--primary)', marginTop: '1.25rem', marginBottom: '0.75rem' }}>{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
        // Find first bold part
        const boldMatch = line.match(/\*\*(.*?)\*\*/);
        if (boldMatch) {
          const boldText = boldMatch[1];
          const restText = line.replace(/1\.\s\*\*.*?\*\*\s*|2\.\s\*\*.*?\*\*\s*|3\.\s\*\*.*?\*\*\s*/, '');
          return (
            <p key={i} style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
              <strong>{boldText}</strong> {restText}
            </p>
          );
        }
      }
      if (line.startsWith('- ')) {
        const boldMatch = line.match(/\*\*(.*?)\*\*/);
        if (boldMatch) {
          const boldText = boldMatch[1];
          const restText = line.replace(/-\s\*\*.*?\*\*\s*/, '');
          return (
            <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
              <strong>{boldText}</strong> {restText}
            </li>
          );
        }
        return <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>{line.replace('- ', '')}</li>;
      }
      return <p key={i} style={{ marginBottom: '0.75rem' }}>{line}</p>;
    });
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="brand">
          <span>🛡️</span> FinanceTracker
        </div>
        <div className="nav-actions">
          <span className="user-email">{userEmail}</span>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        {/* Left column (Main content) */}
        <div className="main-content">
          {/* Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Recharts Chart Block */}
          <div className="card-block">
            <h3 className="block-title">📊 Financial Activity Timeline</h3>
            {chartData.length === 0 ? (
              <div className="empty-state" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Insert income or expense transactions to view timeline visualization.
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--income)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--income)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--expense)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--expense)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-glass)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Area type="monotone" dataKey="Income" stroke="var(--income)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Expenses" stroke="var(--expense)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            filterType={filterType}
            setFilterType={setFilterType}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
          />
        </div>

        {/* Right column (Sidebar) */}
        <div className="side-content">
          {/* Add Transaction Form */}
          <TransactionForm onTransactionAdded={fetchDashboardData} showToast={showToast} />

          {/* AI Insights Card */}
          <div className="card-block ai-insights-block">
            <h3 className="block-title" style={{ borderBottomColor: 'rgba(99, 102, 241, 0.2)' }}>
              🤖 AI Financial Advisor
            </h3>
            
            {insights ? (
              <div className="insights-text">
                {renderInsights(insights)}
                <button
                  className="btn btn-secondary"
                  onClick={handleGetInsights}
                  disabled={loadingInsights}
                  style={{ marginTop: '1.5rem', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                >
                  {loadingInsights ? 'Analyzing Data...' : 'Recalculate Insights'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Analyze your overall transactions pattern and category-wise details for personalized, actionable advice.
                </p>
                {loadingInsights ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="pulse">
                      Consulting Gemini Financial Engine...
                    </span>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={handleGetInsights}>
                    ✨ Generate AI Insights
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Expense Category breakdown Chart */}
          {summary.byCategory && summary.byCategory.length > 0 && (
            <div className="card-block">
              <h3 className="block-title">🍕 Expense Breakdown</h3>
              <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="category"
                    >
                      {summary.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `£${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-glass)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'center', marginTop: '1rem' }}>
                {summary.byCategory.map((entry, index) => (
                  <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span style={{ color: 'var(--text-secondary)' }}>{entry.category} (£{entry.total.toFixed(0)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
