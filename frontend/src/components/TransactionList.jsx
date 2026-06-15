import React from 'react';

const TransactionList = ({
  transactions,
  onDelete,
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  filterMonth,
  setFilterMonth
}) => {

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(val);
  };

  // Helper to map categories to modern emojis/icons
  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍔',
      transport: '🚗',
      housing: '🏠',
      entertainment: '🎬',
      subscriptions: '📺',
      health: '🏥',
      clothing: '👕',
      salary: '💰',
      freelance: '💼',
      gift: '🎁',
      other: '📝'
    };
    return icons[category.toLowerCase()] || '📝';
  };

  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const allCategories = [
    'Food', 'Transport', 'Housing', 'Entertainment', 'Subscriptions', 
    'Health', 'Clothing', 'Salary', 'Freelance', 'Gift', 'Other'
  ];

  return (
    <div className="card-block">
      <div className="block-title">
        <h3>📋 Transactions</h3>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="form-input"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="form-input"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="form-input"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="tx-list">
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions matching your criteria.</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="tx-item">
              <div className="tx-info">
                <div className="tx-header-row">
                  <span style={{ fontSize: '1.25rem' }}>{getCategoryIcon(tx.category)}</span>
                  <span className="tx-note">{tx.note || tx.category}</span>
                  <span className={`tx-badge ${tx.type}`}>
                    {tx.type}
                  </span>
                </div>
                <span className="tx-subtext">
                  Category: {tx.category} • {tx.date}
                </span>
              </div>
              
              <div className="tx-actions">
                <span className={`tx-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
                
                <button
                  className="tx-delete-btn"
                  title="Delete Transaction"
                  onClick={() => onDelete(tx.id)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;
