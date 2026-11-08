require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loadDB, saveDB, initDB, uuidv4 } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'digital-bank-super-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize DB
initDB();

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const data = loadDB();
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password: hash,
      name,
      balance: 0,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    saveDB(data);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, balance: newUser.balance }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const data = loadDB();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, balance: user.balance }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== USER / ACCOUNT ROUTES ==========

// Get current user profile + balance
app.get('/api/me', auth, (req, res) => {
  const data = loadDB();
  const user = data.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance,
    createdAt: user.createdAt
  });
});

// Get transactions for current user
app.get('/api/transactions', auth, (req, res) => {
  const data = loadDB();
  const txs = data.transactions
    .filter(t => t.fromUserId === req.userId || t.toUserId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(t => {
      const fromUser = data.users.find(u => u.id === t.fromUserId);
      const toUser = data.users.find(u => u.id === t.toUserId);
      return {
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
        from: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email } : null,
        to: toUser ? { id: toUser.id, name: toUser.name, email: toUser.email } : null,
        direction: t.toUserId === req.userId ? 'in' : 'out'
      };
    });
  res.json(txs);
});

// Transfer money
app.post('/api/transfer', auth, (req, res) => {
  try {
    const { toEmail, amount, description } = req.body;
    const numAmount = parseFloat(amount);

    if (!toEmail || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid recipient email and positive amount required' });
    }

    const data = loadDB();
    const sender = data.users.find(u => u.id === req.userId);
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    if (sender.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const recipient = data.users.find(u => u.email.toLowerCase() === toEmail.toLowerCase());
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    if (recipient.id === sender.id) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    // Perform transfer
    sender.balance = Math.round((sender.balance - numAmount) * 100) / 100;
    recipient.balance = Math.round((recipient.balance + numAmount) * 100) / 100;

    const tx = {
      id: uuidv4(),
      fromUserId: sender.id,
      toUserId: recipient.id,
      amount: numAmount,
      type: 'transfer',
      description: description || `Transfer to ${recipient.name}`,
      createdAt: new Date().toISOString()
    };
    data.transactions.push(tx);
    saveDB(data);

    res.json({
      message: 'Transfer successful',
      transaction: tx,
      newBalance: sender.balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deposit (demo only - add money to own account)
app.post('/api/deposit', auth, (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000) {
      return res.status(400).json({ error: 'Amount must be between 0.01 and 10000' });
    }

    const data = loadDB();
    const user = data.users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.balance = Math.round((user.balance + numAmount) * 100) / 100;

    const tx = {
      id: uuidv4(),
      fromUserId: null,
      toUserId: user.id,
      amount: numAmount,
      type: 'deposit',
      description: 'Demo deposit',
      createdAt: new Date().toISOString()
    };
    data.transactions.push(tx);
    saveDB(data);

    res.json({ message: 'Deposit successful', newBalance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start
app.listen(PORT, () => {
  console.log(`\n🚀 Digital Bank API running on http://localhost:${PORT}`);
  console.log(`   Demo accounts:`);
  console.log(`   - alice@demo.com / password123  (balance ~$2500)`);
  console.log(`   - bob@demo.com   / password123  (balance ~$1800)`);
  console.log(`\n`);
}); 
