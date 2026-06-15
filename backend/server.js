const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const insightRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for all requests (crucial for React communication)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Server health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', message: 'Finance Tracker backend is healthy.' });
});

// Register routes
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/insights', insightRoutes);

// Global fallback handler for undefined paths
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Finance Tracker backend server running on port ${PORT}`);
});
