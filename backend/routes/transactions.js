const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Protect all routes in this file with JWT verification
router.use(authMiddleware);

// POST /transactions
router.post('/', async (req, res) => {
  const { amount, type, category, note, date } = req.body;

  // Validation
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (!type || (type !== 'income' && type !== 'expense')) {
    return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
  }

  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }

  const transactionDate = date || new Date().toISOString().split('T')[0];

  try {
    const queryText = `
      INSERT INTO transactions (user_id, amount, type, category, note, date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, amount, type, category, note, date
    `;
    const result = await db.query(queryText, [
      req.userId,
      parsedAmount,
      type,
      category,
      note || '',
      transactionDate
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Server error creating transaction' });
  }
});

// GET /transactions
router.get('/', async (req, res) => {
  const { type, category, month } = req.query;

  try {
    const queryParams = [req.userId];
    let queryText = 'SELECT id, amount, type, category, note, to_char(date, \'YYYY-MM-DD\') as date, created_at FROM transactions WHERE user_id = $1';
    let paramIndex = 2;

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM date) = $${paramIndex}`;
      queryParams.push(parseInt(month, 10));
      paramIndex++;
    }

    queryText += ' ORDER BY date DESC, created_at DESC';

    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Server error retrieving transactions' });
  }
});

// GET /summary
router.get('/summary', async (req, res) => {
  try {
    const incomePromise = db.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1 AND type = 'income'",
      [req.userId]
    );

    const expensePromise = db.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1 AND type = 'expense'",
      [req.userId]
    );

    const categoryPromise = db.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'expense' 
       GROUP BY category 
       ORDER BY total DESC`,
      [req.userId]
    );

    const [incomeResult, expenseResult, categoryResult] = await Promise.all([
      incomePromise,
      expensePromise,
      categoryPromise
    ]);

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);
    const balance = totalIncome - totalExpenses;
    const byCategory = categoryResult.rows.map(r => ({
      category: r.category,
      total: parseFloat(r.total)
    }));

    res.json({
      totalIncome,
      totalExpenses,
      balance,
      byCategory
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Server error retrieving summary data' });
  }
});

// DELETE /transactions/:id
router.delete('/:id', async (req, res) => {
  const transactionId = parseInt(req.params.id, 10);
  if (isNaN(transactionId)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  try {
    // Crucial security check: delete where id = X AND user_id = Y
    const result = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [transactionId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    res.json({ message: 'Transaction deleted successfully', id: transactionId });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Server error deleting transaction' });
  }
});

module.exports = router;
