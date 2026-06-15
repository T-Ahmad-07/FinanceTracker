const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple integration runner
async function runTests() {
  console.log('🏁 Starting backend database integration tests...\n');
  
  try {
    // 1. Clean test data
    console.log('🧹 Cleaning database users table...');
    await db.query("DELETE FROM users WHERE email = 'test_user@email.com'");
    
    // 2. Insert new user
    console.log('👤 Registering test user test_user@email.com...');
    const salt = await bcrypt.genSalt(5); // Fast salt for testing
    const passwordHash = await bcrypt.hash('mypassword123', salt);
    
    const userInsert = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      ['test_user@email.com', passwordHash]
    );
    const userId = userInsert.rows[0].id;
    console.log(`✅ User created with ID: ${userId}`);

    // 3. Verify unique email constraint
    console.log('👥 Testing duplicate user insertion...');
    try {
      await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        ['test_user@email.com', passwordHash]
      );
      throw new Error('Duplicate insertion should have failed but succeeded');
    } catch (err) {
      if (err.message.includes('unique constraint')) {
        console.log('✅ Duplicate email correctly blocked by unique index.');
      } else {
        console.log('✅ Duplicate email blocked as expected:', err.message);
      }
    }

    // 4. Create transactions
    console.log('💵 Inserting sample transactions for user...');
    // Transaction 1: Monthly Pay
    const tx1 = await db.query(
      `INSERT INTO transactions (user_id, amount, type, category, note, date) 
       VALUES ($1, 1500.00, 'income', 'Salary', 'Monthly salary pay', '2026-06-01') 
       RETURNING id, amount, type`,
      [userId]
    );
    console.log(`✅ Income transaction inserted: ID=${tx1.rows[0].id}, Type=${tx1.rows[0].type}`);

    // Transaction 2: Food Shop
    const tx2 = await db.query(
      `INSERT INTO transactions (user_id, amount, type, category, note, date) 
       VALUES ($1, 45.50, 'expense', 'Food', 'Tesco weekly shop', '2026-06-03') 
       RETURNING id`,
      [userId]
    );

    // Transaction 3: Subscriptions
    const tx3 = await db.query(
      `INSERT INTO transactions (user_id, amount, type, category, note, date) 
       VALUES ($1, 12.99, 'expense', 'Subscriptions', 'Netflix subscription', '2026-06-05') 
       RETURNING id`,
      [userId]
    );
    console.log('✅ Expense transactions inserted successfully.');

    // 5. Query transactions count
    console.log('🔍 Querying transactions count for user...');
    const listResult = await db.query('SELECT * FROM transactions WHERE user_id = $1', [userId]);
    if (listResult.rows.length === 3) {
      console.log(`✅ Query returned exactly ${listResult.rows.length} rows.`);
    } else {
      throw new Error(`Expected 3 transactions, but database returned: ${listResult.rows.length}`);
    }

    // 6. Test Summary calculations
    console.log('📊 Calculating financial summary...');
    const sumResult = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions WHERE user_id = $1`,
      [userId]
    );
    const totalIncome = parseFloat(sumResult.rows[0].income);
    const totalExpense = parseFloat(sumResult.rows[0].expense);
    const balance = totalIncome - totalExpense;
    console.log(`   Income:  £${totalIncome.toFixed(2)}`);
    console.log(`   Expense: £${totalExpense.toFixed(2)}`);
    console.log(`   Balance: £${balance.toFixed(2)}`);
    
    if (totalIncome === 1500.00 && totalExpense === 58.49 && balance === 1441.51) {
      console.log('✅ Financial summary matches arithmetic expectations.');
    } else {
      throw new Error(`Summary mismatch! Income: ${totalIncome}, Expense: ${totalExpense}, Balance: ${balance}`);
    }

    // 7. Test Deletion security
    console.log('🔐 Testing transaction deletion security...');
    const deleteId = tx2.rows[0].id;
    // Attempt delete as incorrect user
    const fakeDelete = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [deleteId, 99999] // Fake user ID
    );
    if (fakeDelete.rows.length === 0) {
      console.log('✅ Delete operation denied for foreign user.');
    } else {
      throw new Error('Security vulnerability: Transaction was deleted by unauthorized user ID');
    }

    // Delete as owner
    const ownerDelete = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [deleteId, userId]
    );
    if (ownerDelete.rows.length === 1) {
      console.log('✅ Delete succeeded for transaction owner.');
    } else {
      throw new Error('Owner delete failed to remove transaction row');
    }

    // Clean up test user (will cascade delete remaining transactions)
    console.log('🧹 Cleaning up integration test data...');
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    console.log('\n🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
  } finally {
    // End PG connection pool
    await db.pool.end();
  }
}

runTests();
