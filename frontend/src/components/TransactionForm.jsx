import React, { useState } from 'react';
import api from '../api';

const TransactionForm = ({ onTransactionAdded, showToast }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const expenseCategories = ['Food', 'Transport', 'Housing', 'Entertainment', 'Subscriptions', 'Health', 'Clothing', 'Other'];
  const incomeCategories = ['Salary', 'Freelance', 'Gift', 'Other'];

  const handleTypeChange = (newType) => {
    setType(newType);
    // Set default category for chosen type
    setCategory(newType === 'income' ? 'Salary' : 'Food');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Amount must be a positive number', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/transactions', {
        amount: parsedAmount,
        type,
        category,
        note,
        date
      });
      
      // Reset form
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      
      showToast('Transaction added successfully!', 'success');
      onTransactionAdded();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to add transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="card-block">
      <h3 className="block-title">➕ Add Transaction</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="toggle-container">
            <button
              type="button"
              className={`toggle-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`toggle-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              Income
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="amount">Amount (£)</label>
          <input
            className="form-input"
            type="number"
            id="amount"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="category">Category</label>
          <select
            className="form-input"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {currentCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="date">Date</label>
          <input
            className="form-input"
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="note">Note</label>
          <input
            className="form-input"
            type="text"
            id="note"
            placeholder="e.g. Tesco weekly shop"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
