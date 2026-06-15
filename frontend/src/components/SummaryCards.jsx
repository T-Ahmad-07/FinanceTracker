import React from 'react';

const SummaryCards = ({ summary }) => {
  const { totalIncome = 0, totalExpenses = 0, balance = 0 } = summary || {};

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(val);
  };

  return (
    <div className="summary-grid">
      <div className="summary-card income-card">
        <span className="summary-title">📈 Total Income</span>
        <span className="summary-value">{formatCurrency(totalIncome)}</span>
      </div>
      <div className="summary-card expense-card">
        <span className="summary-title">📉 Total Expenses</span>
        <span className="summary-value">{formatCurrency(totalExpenses)}</span>
      </div>
      <div className="summary-card balance-card">
        <span className="summary-title">⚖️ Net Balance</span>
        <span className="summary-value">{formatCurrency(balance)}</span>
      </div>
    </div>
  );
};

export default SummaryCards;
