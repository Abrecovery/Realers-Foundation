const API_URL = 'http://localhost:4000/api';

// State
let token = localStorage.getItem('token');
let currentUser = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const balanceAmount = document.getElementById('balance-amount');
const userGreeting = document.getElementById('user-greeting');
const txList = document.getElementById('tx-list');

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    loginForm.classList.toggle('hidden', target !== 'login');
    registerForm.classList.toggle('hidden', target !== 'register');
    authError.textContent = '';
  });
});

// Auth helpers
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showDashboard() {
  authScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  loadDashboard();
}

function showAuth() {
  dashboardScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  } catch (err) {
    authError.textContent = err.message;
  }
});

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
      })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  } catch (err) {
    authError.textContent = err.message;
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', showAuth);

// Load dashboard data
async function loadDashboard() {
  try {
    const user = await api('/me');
    currentUser = user;
    userGreeting.textContent = `Hi, ${user.name.split(' ')[0]}`;
    balanceAmount.textContent = formatMoney(user.balance);

    const txs = await api('/transactions');
    renderTransactions(txs);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Unauthorized') || err.message.includes('token')) {
      showAuth();
    }
  }
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function renderTransactions(txs) {
  if (!txs.length) {
    txList.innerHTML = '<p class="empty">No transactions yet.</p>';
    return;
  }

  txList.innerHTML = txs.map(tx => {
    const isIn = tx.direction === 'in';
    let title = '';
    if (tx.type === 'deposit') title = 'Deposit';
    else if (isIn) title = `From ${tx.from?.name || 'Unknown'}`;
    else title = `To ${tx.to?.name || 'Unknown'}`;

    const date = new Date(tx.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="tx-item">
        <div class="tx-info">
          <span class="tx-title">${title}</span>
          <span class="tx-meta">${date}${tx.description ? ' · ' + tx.description : ''}</span>
        </div>
        <span class="tx-amount ${isIn ? 'in' : 'out'}">
          ${isIn ? '+' : '−'}${formatMoney(tx.amount)}
        </span>
      </div>
    `;
  }).join('');
}

// Transfer modal
const transferModal = document.getElementById('transfer-modal');
document.getElementById('show-transfer-btn').addEventListener('click', () => {
  transferModal.classList.remove('hidden');
  document.getElementById('transfer-error').textContent = '';
});
document.getElementById('cancel-transfer').addEventListener('click', () => {
  transferModal.classList.add('hidden');
});

document.getElementById('transfer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('transfer-error');
  errEl.textContent = '';
  try {
    const result = await api('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        toEmail: document.getElementById('transfer-email').value,
        amount: document.getElementById('transfer-amount').value,
        description: document.getElementById('transfer-note').value
      })
    });
    transferModal.classList.add('hidden');
    document.getElementById('transfer-form').reset();
    loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// Deposit modal
const depositModal = document.getElementById('deposit-modal');
document.getElementById('show-deposit-btn').addEventListener('click', () => {
  depositModal.classList.remove('hidden');
  document.getElementById('deposit-error').textContent = '';
});
document.getElementById('cancel-deposit').addEventListener('click', () => {
  depositModal.classList.add('hidden');
});

document.getElementById('deposit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('deposit-error');
  errEl.textContent = '';
  try {
    await api('/deposit', {
      method: 'POST',
      body: JSON.stringify({
        amount: document.getElementById('deposit-amount').value
      })
    });
    depositModal.classList.add('hidden');
    document.getElementById('deposit-form').reset();
    loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// Refresh
document.getElementById('refresh-btn').addEventListener('click', loadDashboard);

// Init
if (token) {
  showDashboard();
} else {
  showAuth();
}
