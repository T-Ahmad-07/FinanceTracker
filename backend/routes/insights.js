const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// GET /insights
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 1. Fetch recent transactions for prompt context
    const transactionsResult = await db.query(
      `SELECT amount, type, category, note, to_char(date, 'YYYY-MM-DD') as date 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC 
       LIMIT 30`,
      [req.userId]
    );
    
    // 2. Fetch financial totals
    const totalsResult = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions 
       WHERE user_id = $1`,
      [req.userId]
    );

    const transactions = transactionsResult.rows;
    const totalIncome = parseFloat(totalsResult.rows[0].total_income);
    const totalExpenses = parseFloat(totalsResult.rows[0].total_expense);
    const balance = totalIncome - totalExpenses;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment. Providing analytical mock fallback insights.');
      const insights = getMockInsights(totalIncome, totalExpenses, balance, transactions);
      return res.json({ insights, isMock: true });
    }

    // 3. Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Format transaction log for prompt context
    const txSummary = transactions
      .map(t => `- ${t.date}: ${t.type === 'income' ? 'Income' : 'Expense'} £${t.amount} | Category: ${t.category} ${t.note ? '| Note: ' + t.note : ''}`)
      .join('\n');

    const prompt = `You are a professional personal finance AI advisor. Here is a summary of the user's accounts:
- Total Income: £${totalIncome.toFixed(2)}
- Total Expenses: £${totalExpenses.toFixed(2)}
- Current Net Balance: £${balance.toFixed(2)}

Recent transaction log:
${txSummary || 'No transaction logs recorded yet.'}

Task: Give 3 specific, highly-actionable, and friendly tips to help them manage their money better, optimize their spending, or grow their savings based on their current balance and transactions. 
Format requirements:
- Use Markdown.
- Keep each point clear, concise (2-3 sentences max).
- Jump straight into the insights. No intro like "Sure, here are..." and no outro.`;

    let responseText = '';
    let success = false;
    // Resilient list of models to try (preferring latest active generations)
    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting Gemini generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const aiResult = await model.generateContent(prompt);
        responseText = aiResult.response.text();
        success = true;
        console.log(`Gemini generation succeeded with model: ${modelName}`);
        break;
      } catch (modelErr) {
        console.warn(`Model ${modelName} failed/deprecated:`, modelErr.message);
      }
    }

    if (!success) {
      throw new Error('All Gemini model choices failed or are deprecated.');
    }

    res.json({ insights: responseText, isMock: false });
  } catch (err) {
    console.error('Gemini Insights generation failed:', err);
    // Return mock insights as error fallback rather than crashing
    const totalsResult = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions 
       WHERE user_id = $1`,
      [req.userId]
    );
    const totalIncome = parseFloat(totalsResult.rows[0].total_income);
    const totalExpenses = parseFloat(totalsResult.rows[0].total_expense);
    const balance = totalIncome - totalExpenses;
    
    const insights = getMockInsights(totalIncome, totalExpenses, balance, []);
    res.json({ insights, isMock: true, errorFallback: true });
  }
});

function getMockInsights(income, expenses, balance, transactions) {
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;
  
  // Custom suggestion based on category count
  let categoryInsights = '';
  if (transactions && transactions.length > 0) {
    const categories = transactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount);
      }
      return acc;
    }, {});
    
    const sortedCategories = Object.entries(categories).sort((a,b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      categoryInsights = `Your largest expense category is **${sortedCategories[0][0]}** (spent £${sortedCategories[0][1].toFixed(2)}). Try planning ahead to reduce items in this area.`;
    }
  }

  if (!categoryInsights) {
    categoryInsights = "Track your daily coffee or food items; small habits can compound into major savings over a month.";
  }

  return `### 💡 Personal Finance Advisor (Demo Mode)

Here are some analytical recommendations based on your transaction profile:

1. **Savings Rate: ${savingsRate}%**
   You've kept **£${balance.toFixed(2)}** of your **£${income.toFixed(2)}** total earnings. A baseline savings rate of 15-20% is ideal; see if you can allocate extra cash towards investments or high-yield accounts.

2. **Categorized Spending Focus**
   ${categoryInsights}

3. **Establish an Emergency Fund Buffer**
   Your current monthly outflow is **£${expenses.toFixed(2)}**. We recommend maintaining a liquid emergency fund of at least **£${(expenses * 3).toFixed(2)}** (representing 3 months of expenses) to protect against unexpected life events.`;
}

module.exports = router;
