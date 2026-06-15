# FinanceTracker - Relational Personal Finance & AI Insights

A state-of-the-art personal finance manager consisting of a secure Node.js REST API backend connected to a relational PostgreSQL database, and an interactive, glassmorphic React frontend dashboard displaying live Recharts spending activity and personalized Gemini-powered financial recommendations.

---

## 🛠️ Architecture & Technology Choices

### 1. Relational Database: PostgreSQL over MongoDB
* **Referential Integrity**: Financial records are naturally relational. A transaction *must* belong to an authenticated user. PostgreSQL enforces this relationship using foreign keys (`REFERENCES users(id) ON DELETE CASCADE`), guaranteeing that orphaned transactions cannot exist.
* **Aggregations & Grouping**: Extracting balances, monthly totals, and category-wise distributions requires grouping queries (e.g. `SUM(amount) GROUP BY category`). Relational databases compute these on the index level far more efficiently and predictably than document store databases.
* **ACID Compliance**: Transferring and reporting balances requires strict consistency. PostgreSQL prevents race conditions or dirty reads during transactions.

### 2. Stateless Authentication: JSON Web Tokens (JWT)
* **Horizontally Scalable**: The backend does not need to store active sessions or database-bound query checks on every request. The token itself contains the user context (`id`, `email`), making the REST API completely stateless.
* **Secure Decoupling**: Once verified on the server side via the `auth.js` middleware, the claims are trusted, reducing internal database roundtrips.

---

## 🛡️ Key Security Measures & Bug Fixes

### 🐛 Fixed: Authorization Bypass in Transaction Deletion
During development, a standard route design allowed resource deletions using:
```sql
DELETE FROM transactions WHERE id = $1;
```
This created a vulnerability: any authenticated user could delete another user's transaction simply by guessing or guessing the transaction ID. 

**Solution**: Added a strict ownership verification check to the DELETE operation by binding both the resource ID and the session `user_id` inside the parameter query:
```javascript
const result = await db.query(
  'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
  [transactionId, req.userId]
);
```
If the transaction ID does not belong to the requesting user, the query returns 0 rows, and the API responds with a secure `404 Not Found or unauthorized` status, preventing unauthorized data tampering.

---

## 📈 Scalability Roadmap
1. **Caching Layer (Redis)**: Introduce Redis caching for the `/transactions/summary` endpoint. The summary query runs aggregate SQL functions which can become slow as transactions scale into the millions. Caching key user summaries and invalidating them only when a transaction is written or deleted ensures sub-millisecond response times.
2. **Rate Limiting**: Apply API rate limiters (using `express-rate-limit`) on the `/auth/login` and `/auth/register` endpoints to protect against brute-force attacks and password spraying.
3. **Database Indexing**: Create composite indexes on `transactions (user_id, date DESC)` to optimize pagination and list queries, and `transactions (user_id, type)` for instant summary totals.

---

## 🚀 Setup & Execution Guide

### Prerequisites
* Node.js (v16+)
* PostgreSQL running locally (defaulting to port `5432`)

### 1. Database Setup
Ensure PostgreSQL is active and create the database `finance_tracker`. Initialize the schema:
```bash
/usr/local/opt/postgresql@14/bin/createdb finance_tracker
/usr/local/opt/postgresql@14/bin/psql -d finance_tracker -f backend/init.sql
```

### 2. Backend Environment Config
Create `/backend/.env` with:
```env
PORT=5001
DATABASE_URL=postgresql://localhost:5432/finance_tracker
JWT_SECRET=super_secret_key_for_finance_tracker
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If `GEMINI_API_KEY` is omitted, the backend falls back to providing detailed mock advisor insights so the dashboard remains fully operational).*

### 3. Running Backend
From the root directory:
```bash
cd backend
npm install
npm start
```

### 4. Running Frontend
From the root directory:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at the Vite URL (typically `http://localhost:5173`).
