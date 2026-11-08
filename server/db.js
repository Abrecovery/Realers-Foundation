const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data.json');

const defaultData = {
  users: [
    {
      id: "user-1",
      email: "alice@demo.com",
      password: "$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQbF.vKqKzqKzqKzqKzqKzqKzqKzqK", // will be replaced
      name: "Alice Johnson",
      balance: 2500.00,
      createdAt: new Date().toISOString()
    },
    {
      id: "user-2",
      email: "bob@demo.com",
      password: "$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQbF.vKqKzqKzqKzqKzqKzqKzqKzqK",
      name: "Bob Smith",
      balance: 1800.50,
      createdAt: new Date().toISOString()
    }
  ],
  transactions: []
};

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading DB:', err.message);
  }
  return JSON.parse(JSON.stringify(defaultData));
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving DB:', err.message);
  }
}

// Initialize with proper hashed passwords on first run
function initDB() {
  const bcrypt = require('bcryptjs');
  let data = loadDB();
  
  // Check if passwords need hashing (demo accounts)
  const needsInit = data.users.some(u => u.password.startsWith('$2a$10$8K1p'));
  if (needsInit || data.users.length === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    data.users = [
      {
        id: "user-1",
        email: "alice@demo.com",
        password: hash,
        name: "Alice Johnson",
        balance: 2500.00,
        createdAt: new Date().toISOString()
      },
      {
        id: "user-2",
        email: "bob@demo.com",
        password: hash,
        name: "Bob Smith",
        balance: 1800.50,
        createdAt: new Date().toISOString()
      }
    ];
    data.transactions = [
      {
        id: uuidv4(),
        fromUserId: null,
        toUserId: "user-1",
        amount: 2500.00,
        type: "deposit",
        description: "Initial deposit",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: uuidv4(),
        fromUserId: null,
        toUserId: "user-2",
        amount: 1800.50,
        type: "deposit",
        description: "Initial deposit",
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
      }
    ];
    saveDB(data);
  }
  return data;
}

module.exports = { loadDB, saveDB, initDB, uuidv4 }; 
