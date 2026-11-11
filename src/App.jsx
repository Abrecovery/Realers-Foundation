import React, { useState, useEffect } from 'react';
import { 
  Wallet, Send, ArrowDownRight, Smartphone, Zap, PiggyBank, 
  TrendingUp, ShieldCheck, User, LogOut, Eye, EyeOff, CheckCircle2, 
  Plus, ChevronRight, Globe, Lock, Mail, Phone, RefreshCw, X, FileText, Loader2, Users, Sliders, AlertCircle
} from 'lucide-react';

// Currency Rates relative to USD (NGN excluded)
const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)' }
};

export default function App() {
  // Authentication & Profile State
  const [user, setUser] = useState(null);

  const [authStep, setAuthStep] = useState('login'); // 'login', 'signup_details', 'signup_otp', 'signup_pin'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    otp: '',
    password: '',
    pin: ''
  });

  // Admin Selected User State for Balance Modification
  const [adminTargetUser, setAdminTargetUser] = useState(null);
  const [adminActionData, setAdminActionData] = useState({ type: 'increase', amount: '', reason: '' });

  // Generated Real OTP & Sending Loader State
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // User-Specific Wallet & Savings State
  const [balance, setBalance] = useState(50.00);
  const [savingsBalance, setSavingsBalance] = useState(0.00);
  const [currency, setCurrency] = useState('USD');
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState(null);

  // User-Specific Transactions State
  const [transactions, setTransactions] = useState([
    { id: 'tx-1', type: 'Grant', title: 'Reliance Welcome Grant', amount: 50.00, date: 'Today', status: 'Completed', ref: 'RF-982341' }
  ]);

  // Modal Inputs & Deposit Prompt State
  const [transferData, setTransferData] = useState({ recipient: '', bank: 'Reliance Internal', amount: '', note: '', pin: '' });
  const [topupData, setTopupData] = useState({ amount: '', method: 'card' });
  const [depositInstruction, setDepositInstruction] = useState(null); // Holds details when user initiates topup
  const [airtimeData, setAirtimeData] = useState({ phone: '', network: 'Global Telecom', amount: '' });
  const [savingsData, setSavingsData] = useState({ amount: '', action: 'deposit' });
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Load account-specific data when a user logs in
  useEffect(() => {
    if (user && !user.isAdmin) {
      const savedBal = localStorage.getItem(`reliance_balance_${user.phone}`);
      const savedSav = localStorage.getItem(`reliance_savings_${user.phone}`);
      const savedTxs = localStorage.getItem(`reliance_txs_${user.phone}`);

      setBalance(savedBal !== null ? parseFloat(savedBal) : 50.00);
      setSavingsBalance(savedSav !== null ? parseFloat(savedSav) : 0.00);
      setTransactions(savedTxs ? JSON.parse(savedTxs) : [
        { id: 'tx-1', type: 'Grant', title: 'Reliance Welcome Grant', amount: 50.00, date: 'Today', status: 'Completed', ref: 'RF-982341' }
      ]);
    }
  }, [user]);

  // Save changes to user-specific localStorage
  useEffect(() => {
    if (user && !user.isAdmin) {
      localStorage.setItem(`reliance_balance_${user.phone}`, balance.toString());
    }
  }, [balance, user]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      localStorage.setItem(`reliance_savings_${user.phone}`, savingsBalance.toString());
    }
  }, [savingsBalance, user]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      localStorage.setItem(`reliance_txs_${user.phone}`, JSON.stringify(transactions));
    }
  }, [transactions, user]);

  // Currency Formatter Helper
  const formatMoney = (amountInUSD) => {
    const curr = CURRENCIES[currency] || CURRENCIES.USD;
    const converted = amountInUSD * curr.rate;
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Real Email Verification Trigger via EmailJS
  const sendEmailVerificationCode = async (userEmail, otpCode) => {
    setIsSendingEmail(true);
    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'YOUR_SERVICE_ID',
          template_id: 'YOUR_TEMPLATE_ID',
          user_id: 'YOUR_PUBLIC_KEY',
          template_params: {
            to_email: userEmail,
            passcode: otpCode,
            user_name: formData.fullName
          }
        })
      });
    } catch (err) {
      console.error('Email verification dispatch error:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.password) return alert('Please enter phone/email and password');

    // Master Admin Check
    if ((formData.phone === 'admin@reliance.org' || formData.phone === 'admin') && formData.password === 'admin123') {
      const adminUser = {
        fullName: 'System Administrator',
        email: 'admin@reliance.org',
        phone: '0000000000',
        accountNo: 'ADMIN-001',
        tier: 'Super Admin',
        isAdmin: true
      };
      setUser(adminUser);
      return;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('reliance_registered_users') || '[]');
    const foundUser = registeredUsers.find(
      u => u.phone === formData.phone || u.email === formData.phone
    );

    if (!foundUser) {
      return alert('Account not found! Please register an account first before signing in.');
    }

    setUser(foundUser);
  };

  const handleSignupDetails = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.email) return alert('Please fill in all details');
    
    const registeredUsers = JSON.parse(localStorage.getItem('reliance_registered_users') || '[]');
    const exists = registeredUsers.some(u => u.phone === formData.phone || u.email === formData.email);
    if (exists) {
      return alert('An account with this phone or email already exists. Please log in instead.');
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otpCode);

    await sendEmailVerificationCode(formData.email, otpCode);
    setAuthStep('signup_otp');
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (formData.otp !== generatedOtp) {
      return alert(`Invalid code! Please check your email inbox at ${formData.email}`);
    }
    setAuthStep('signup_pin');
  };

  const handleCompleteRegistration = (e) => {
    e.preventDefault();
    if (formData.pin.length !== 4) return alert('PIN must be 4 digits');
    
    const newUser = {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      accountNo: '30' + formData.phone.replace(/[^0-9]/g, '').slice(-8),
      tier: 'Tier 3 (Global Verified)',
      isAdmin: false
    };

    const registeredUsers = JSON.parse(localStorage.getItem('reliance_registered_users') || '[]');
    registeredUsers.push(newUser);
    localStorage.setItem('reliance_registered_users', JSON.stringify(registeredUsers));

    setUser(newUser);
    setBalance(50.00); // $50 USD Welcome Bonus
  };

  const handleLogout = () => {
    setUser(null);
    setAdminTargetUser(null);
    setActiveTab('home');
    setAuthStep('login');
    setFormData({ fullName: '', email: '', phone: '', otp: '', password: '', pin: '' });
  };

  // Admin Fund Modification Handler
  const handleAdminModifyBalance = (e) => {
    e.preventDefault();
    const amt = parseFloat(adminActionData.amount);
    if (amt <= 0 || isNaN(amt)) return alert('Enter a valid amount');

    const targetPhone = adminTargetUser.phone;
    const currentBalKey = `reliance_balance_${targetPhone}`;
    const currentTxsKey = `reliance_txs_${targetPhone}`;

    const existingBal = parseFloat(localStorage.getItem(currentBalKey) || '50.00');
    const existingTxs = JSON.parse(localStorage.getItem(currentTxsKey) || '[]');

    const newBal = adminActionData.type === 'increase' ? existingBal + amt : Math.max(0, existingBal - amt);
    localStorage.setItem(currentBalKey, newBal.toString());

    const adminTx = {
      id: `ADMIN-${Date.now()}`,
      type: adminActionData.type === 'increase' ? 'Admin Credit' : 'Admin Debit',
      title: adminActionData.reason || (adminActionData.type === 'increase' ? 'Admin Credited Funds' : 'Admin Deducted Funds'),
      amount: adminActionData.type === 'increase' ? amt : -amt,
      date: 'Just now',
      status: 'Verified',
      ref: `ADM-${Math.floor(100000 + Math.random() * 900000)}`
    };

    localStorage.setItem(currentTxsKey, JSON.stringify([adminTx, ...existingTxs]));
    alert(`Successfully updated account balance for ${adminTargetUser.fullName}! New Balance: $${newBal.toFixed(2)}`);
    
    setAdminTargetUser(null);
    setAdminActionData({ type: 'increase', amount: '', reason: '' });
  };

  // Trigger Deposit Instructions Prompt
  const handleInitiateTopup = (e) => {
    e.preventDefault();
    const amt = parseFloat(topupData.amount);
    if (amt <= 0 || isNaN(amt)) return alert('Enter valid deposit amount');

    // Close topup modal and open the explicit Opay transfer instruction prompt
    setActiveModal(null);
    setDepositInstruction({
      amount: amt,
      currencySymbol: CURRENCIES[currency]?.symbol || '$',
      method: topupData.method
    });
    setTopupData({ amount: '', method: 'card' });
  };

  // Standard Transactions Actions
  const executeTransfer = (e) => {
    e.preventDefault();
    const currRate = CURRENCIES[currency] ? CURRENCIES[currency].rate : 1.0;
    const amt = parseFloat(transferData.amount) / currRate;
    if (amt <= 0 || isNaN(amt)) return alert('Enter valid amount');
    if (amt > balance) return alert('Insufficient balance');
    if (transferData.pin.length !== 4) return alert('Enter 4-digit PIN');

    setBalance(prev => prev - amt);
    const newTx = {
      id: `TX-${Date.now()}`,
      type: 'Transfer',
      title: `Transfer to ${transferData.recipient}`,
      amount: -amt,
      date: 'Just now',
      status: 'Success',
      ref: `RF-${Math.floor(100000 + Math.random() * 900000)}`
    };
    setTransactions([newTx, ...transactions]);
    setActiveModal(null);
    setSelectedReceipt(newTx);
    setTransferData({ recipient: '', bank: 'Reliance Internal', amount: '', note: '', pin: '' });
  };

  const executeAirtime = (e) => {
    e.preventDefault();
    const currRate = CURRENCIES[currency] ? CURRENCIES[currency].rate : 1.0;
    const amt = parseFloat(airtimeData.amount) / currRate;
    if (amt <= 0 || isNaN(amt)) return alert('Enter valid amount');
    if (amt > balance) return alert('Insufficient balance');

    const cashback = amt * 0.03;
    setBalance(prev => prev - amt + cashback);

    const newTx = {
      id: `TX-${Date.now()}`,
      type: 'Airtime',
      title: `${airtimeData.network} Airtime (${airtimeData.phone})`,
      amount: -amt,
      date: 'Just now',
      status: 'Success',
      ref: `RF-${Math.floor(100000 + Math.random() * 900000)}`
    };

    const cashbackTx = {
      id: `CB-${Date.now()}`,
      type: 'Cashback',
      title: '3% Airtime Bonus',
      amount: cashback,
      date: 'Just now',
      status: 'Success',
      ref: `CB-${Math.floor(100000 + Math.random() * 900000)}`
    };

    setTransactions([cashbackTx, newTx, ...transactions]);
    setActiveModal(null);
    setAirtimeData({ phone: '', network: 'Global Telecom', amount: '' });
  };

  const executeSavings = (e) => {
    e.preventDefault();
    const currRate = CURRENCIES[currency] ? CURRENCIES[currency].rate : 1.0;
    const amt = parseFloat(savingsData.amount) / currRate;
    if (amt <= 0 || isNaN(amt)) return alert('Enter valid amount');

    if (savingsData.action === 'deposit') {
      if (amt > balance) return alert('Insufficient wallet balance');
      setBalance(prev => prev - amt);
      setSavingsBalance(prev => prev + amt);
    } else {
      if (amt > savingsBalance) return alert('Insufficient savings balance');
      setSavingsBalance(prev => prev - amt);
      setBalance(prev => prev + amt);
    }

    const newTx = {
      id: `TX-${Date.now()}`,
      type: 'Savings',
      title: savingsData.action === 'deposit' ? 'Moved to Reliance Save' : 'Withdrawn from Reliance Save',
      amount: savingsData.action === 'deposit' ? -amt : amt,
      date: 'Just now',
      status: 'Success',
      ref: `RF-${Math.floor(100000 + Math.random() * 900000)}`
    };
    setTransactions([newTx, ...transactions]);
    setActiveModal(null);
    setSavingsData({ amount: '', action: 'deposit' });
  };

  // -------------------------------------------------------------
  // AUTHENTICATION SCREENS
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
              <Globe className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Reliance Foundation</h1>
            <p className="text-slate-400 text-xs">Global Digital Wallet & Financial Empowerment</p>
          </div>

          {authStep === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Registered Phone, Email, or Admin ID</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="e.g. +1 234 567 890 or admin@reliance.org" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition">
                Sign In
              </button>
              <p className="text-center text-xs text-slate-400 pt-2">
                Don't have an account?{' '}
                <button type="button" onClick={() => setAuthStep('signup_details')} className="text-emerald-400 font-semibold underline">
                  Register Profile
                </button>
              </p>
            </form>
          )}

          {authStep === 'signup_details' && (
            <form onSubmit={handleSignupDetails} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Full Legal Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mobile Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email Address (For Verification Code)</label>
                <input 
                  type="email" 
                  placeholder="john@example.com" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSendingEmail}
                className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold py-3 rounded-xl shadow-lg transition flex justify-center items-center gap-2"
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Email'}
              </button>
              <button type="button" onClick={() => setAuthStep('login')} className="w-full text-xs text-slate-400 text-center block pt-2">
                Back to Login
              </button>
            </form>
          )}

          {authStep === 'signup_otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 text-center">
              <p className="text-xs text-slate-300">
                A 4-digit code was dispatched to <strong className="text-emerald-400">{formData.email}</strong>
              </p>
              <input 
                type="text" 
                placeholder="••••" 
                maxLength={4}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                onChange={(e) => setFormData({...formData, otp: e.target.value})}
              />
              <div className="p-2 bg-slate-900/50 rounded-xl border border-slate-700/60 text-[11px] text-slate-400">
                Code sent via Email: <span className="font-mono text-emerald-400 font-bold">{generatedOtp}</span>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold py-3 rounded-xl shadow-lg">
                Verify Email Code
              </button>
            </form>
          )}

          {authStep === 'signup_pin' && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Create Account Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Create 4-Digit Transaction PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="1234" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({...formData, pin: e.target.value})}
                />
              </div>
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>You will receive a <strong>$50 USD Welcome Bonus</strong> instantly!</span>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold py-3 rounded-xl shadow-lg">
                Complete & Claim $50 Bonus
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN DASHBOARD VIEW
  // -------------------------------------------------------------
  if (user && user.isAdmin) {
    const registeredUsers = JSON.parse(localStorage.getItem('reliance_registered_users') || '[]');

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
        <div className="w-full max-w-md bg-slate-900 min-h-screen flex flex-col relative pb-20 border-x border-slate-800 p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Admin Control Center</h2>
                <p className="text-[10px] text-purple-400 font-mono">System Superuser</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-red-400 text-xs font-semibold flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-400" /> Registered User Accounts ({registeredUsers.length})
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Select any account to manually credit or debit funds after verifying Opay transfers.</p>
            
            {registeredUsers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">No registered user accounts found yet.</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {registeredUsers.map((regUser, idx) => {
                  const userBal = localStorage.getItem(`reliance_balance_${regUser.phone}`) || '50.00';
                  return (
                    <div 
                      key={idx}
                      onClick={() => setAdminTargetUser(regUser)}
                      className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-xl p-3 flex justify-between items-center cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold">{regUser.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Phone: {regUser.phone}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Acc: {regUser.accountNo}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">${parseFloat(userBal).toFixed(2)}</div>
                        <div className="text-[9px] text-purple-400 flex items-center gap-1 justify-end mt-0.5">
                          Manage <Sliders className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADMIN MODIFY MODAL */}
          {adminTargetUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">Modify Account Funds</h3>
                    <p className="text-[10px] text-purple-400">{adminTargetUser.fullName} ({adminTargetUser.phone})</p>
                  </div>
                  <button onClick={() => setAdminTargetUser(null)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-400">Current Balance:</span><span className="font-bold text-emerald-400">${parseFloat(localStorage.getItem(`reliance_balance_${adminTargetUser.phone}`) || '50.00').toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Account Number:</span><span className="font-mono">{adminTargetUser.accountNo}</span></div>
                </div>

                <form onSubmit={handleAdminModifyBalance} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Action Type</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white"
                      value={adminActionData.type}
                      onChange={(e) => setAdminActionData({...adminActionData, type: e.target.value})}
                    >
                      <option value="increase">Increase Funds (+) [Opay Verified]</option>
                      <option value="decrease">Reduce Funds (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Amount ($ USD)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs"
                      onChange={(e) => setAdminActionData({...adminActionData, amount: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Reason / Note</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Verified Opay Deposit Transfer #12345" 
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs"
                      onChange={(e) => setAdminActionData({...adminActionData, reason: e.target.value})}
                    />
                  </div>

                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 font-bold py-3 rounded-xl text-xs mt-2 transition">
                    Apply Fund Adjustment
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CLIENT APP DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      {/* Mobile-Sized Container */}
      <div className="w-full max-w-md bg-slate-900 min-h-screen flex flex-col relative pb-20 border-x border-slate-800">
        
        {/* TOP HEADER */}
        <div className="p-4 bg-slate-900/80 sticky top-0 z-20 backdrop-blur-md border-b border-slate-800/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('profile')} 
              className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-600/30 hover:opacity-90 active:scale-95 transition"
            >
              {user.fullName ? user.fullName[0] : 'R'}
            </button>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                Hi, {user.fullName.split(' ')[0]}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium">
                  Verified
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Acc: {user.accountNo}</p>
            </div>
          </div>

          {/* Global Currency Selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer text-xs font-semibold"
            >
              {Object.keys(CURRENCIES).map(curr => (
                <option key={curr} value={curr} className="bg-slate-900 text-white">{curr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-5">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                <Globe className="w-48 h-48" />
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-emerald-100 font-medium flex items-center gap-1">
                  Available Balance
                  <button onClick={() => setShowBalance(!showBalance)} className="ml-1">
                    {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-emerald-100">
                  {CURRENCIES[currency]?.label || 'USD ($)'}
                </span>
              </div>

              <div className="text-3xl font-extrabold tracking-tight mb-4">
                {showBalance ? formatMoney(balance) : '••••••••'}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActiveModal('topup')}
                  className="bg-white text-emerald-900 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" /> Add Money
                </button>
                <button 
                  onClick={() => setActiveModal('transfer')}
                  className="bg-emerald-950/40 border border-white/20 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 backdrop-blur-md active:scale-95 transition"
                >
                  <Send className="w-4 h-4" /> Send Money
                </button>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-3">
                <button 
                  onClick={() => setActiveModal('transfer')}
                  className="bg-slate-800/80 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-800 text-center"
                >
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200">Transfer</span>
                </button>

                <button 
                  onClick={() => setActiveModal('airtime')}
                  className="bg-slate-800/80 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-800 text-center"
                >
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200">Airtime</span>
                </button>

                <button 
                  onClick={() => setActiveTab('savings')}
                  className="bg-slate-800/80 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-800 text-center"
                >
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200">Savings</span>
                </button>

                <button 
                  onClick={() => setActiveModal('topup')}
                  className="bg-slate-800/80 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-800 text-center"
                >
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200">Topup</span>
                </button>
              </div>
            </div>

            {/* Savings Widget Card */}
            <div 
              onClick={() => setActiveTab('savings')}
              className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Reliance Save Vault</h4>
                  <p className="text-[11px] text-slate-400">Earn up to 15% APY Daily</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-amber-400">{formatMoney(savingsBalance)}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                  View <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs text-emerald-400 font-medium">View All</button>
              </div>

              <div className="space-y-2">
                {transactions.slice(0, 4).map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedReceipt(tx)}
                    className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                        {tx.amount > 0 ? <ArrowDownRight className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{tx.title}</div>
                        <div className="text-[10px] text-slate-400">{tx.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </div>
                      <div className="text-[9px] text-slate-500">{tx.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">Reliance Save Vault</h2>
            
            <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-3xl p-5 text-white shadow-xl">
              <div className="text-xs text-amber-100 mb-1">Total Vault Savings</div>
              <div className="text-3xl font-extrabold mb-4">{formatMoney(savingsBalance)}</div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSavingsData({ ...savingsData, action: 'deposit' }); setActiveModal('savings'); }}
                  className="flex-1 bg-white text-amber-900 font-bold py-2.5 rounded-xl text-xs"
                >
                  Deposit Funds
                </button>
                <button 
                  onClick={() => { setSavingsData({ ...savingsData, action: 'withdraw' }); setActiveModal('savings'); }}
                  className="flex-1 bg-amber-950/40 border border-white/20 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">Savings Plan Highlights</h3>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Annual Interest Rate</span>
                <span className="font-bold text-emerald-400">15.0% APY</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Interest Payout</span>
                <span className="font-bold text-slate-200">Daily Auto-Compound</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Lock-in Period</span>
                <span className="font-bold text-slate-200">None (Instant Withdrawal)</span>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-bold mb-2">Transaction History</h2>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedReceipt(tx)}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                      {tx.amount > 0 ? <ArrowDownRight className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{tx.title}</div>
                      <div className="text-[10px] text-slate-400">{tx.date} • Ref: {tx.ref}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                    </div>
                    <div className="text-[9px] text-emerald-400">{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">Account Profile</h2>
            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
                {user.fullName[0]}
              </div>
              <h3 className="font-bold text-base">{user.fullName}</h3>
              <p className="text-xs text-slate-400">{user.email}</p>
              <div className="mt-3 inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-medium">
                {user.tier}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-xs py-2 border-b border-slate-800">
                <span className="text-slate-400">Account Number</span>
                <span className="font-mono font-bold text-slate-200">{user.accountNo}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-slate-800">
                <span className="text-slate-400">Phone Number</span>
                <span className="font-mono font-bold text-slate-200">{user.phone}</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-slate-400">Global Region</span>
                <span className="font-bold text-slate-200">International / Worldwide</span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-emerald-500/20 transition mb-2"
            >
              <RefreshCw className="w-4 h-4" /> Switch Account
            </button>

            <button 
              onClick={handleLogout}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-red-500/20 transition"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 max-w-md w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 p-2 z-20">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] mt-1">Wallet</span>
          </button>

          <button 
            onClick={() => setActiveTab('savings')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'savings' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <PiggyBank className="w-5 h-5" />
            <span className="text-[10px] mt-1">Savings</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1">History</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">Profile</span>
          </button>
        </div>

        {/* MODALS */}
        {activeModal === 'transfer' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">Send Money Worldwide</h3>
                <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={executeTransfer} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Recipient Account / Phone</label>
                  <input 
                    type="text" 
                    placeholder="Enter 10-digit Account Number" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setTransferData({...transferData, recipient: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount ({CURRENCIES[currency]?.symbol || '$'})</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Enter 4-Digit Security PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    placeholder="••••" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm font-mono"
                    onChange={(e) => setTransferData({...transferData, pin: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 font-bold py-3 rounded-xl text-xs mt-2">
                  Confirm & Transfer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TOPUP MODAL */}
        {activeModal === 'topup' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">Add Funds to Wallet</h3>
                <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleInitiateTopup} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount to Add ({CURRENCIES[currency]?.symbol || '$'})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setTopupData({...topupData, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Payment Method</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white"
                    onChange={(e) => setTopupData({...topupData, method: e.target.value})}
                  >
                    <option value="card">Bank Transfer / Opay (Recommended)</option>
                    <option value="crypto">Global Crypto Payment</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-500 font-bold py-3 rounded-xl text-xs mt-2">
                  Proceed to Payment Instructions
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Opay Deposit Instruction Prompt Modal */}
        {depositInstruction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-sm rounded-3xl p-5 space-y-4 text-center shadow-2xl">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Complete Your Deposit</h3>
                <p className="text-xs text-slate-400">Transfer the exact amount to fund your account</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-left space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Intended Amount:</span>
                  <span className="font-bold text-emerald-400 text-sm">{depositInstruction.currencySymbol}{parseFloat(depositInstruction.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Bank Name:</span>
                  <span className="font-bold text-white">OPay Digital Services</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-400">Account Number:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30 text-sm">9042116971</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="font-bold text-slate-200">Reliance Foundation Wallet</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 text-left">
                ℹ️ Your account will be credited automatically or verified and funded by our administration team within a few minutes after transfer.
              </div>

              <button 
                onClick={() => setDepositInstruction(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 font-bold py-3 rounded-xl text-xs text-white"
              >
                I Have Made the Transfer
              </button>
            </div>
          </div>
        )}

        {activeModal === 'airtime' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">Buy Airtime & Data (3% Cashback)</h3>
                <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={executeAirtime} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +1 555 000 000" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setAirtimeData({...airtimeData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Network Provider</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white"
                    onChange={(e) => setAirtimeData({...airtimeData, network: e.target.value})}
                  >
                    <option value="Vodafone">Vodafone</option>
                    <option value="T-Mobile">T-Mobile</option>
                    <option value="AT&T">AT&T</option>
                    <option value="Orange">Orange Global</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount ({CURRENCIES[currency]?.symbol || '$'})</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setAirtimeData({...airtimeData, amount: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 font-bold py-3 rounded-xl text-xs mt-2">
                  Recharge Now
                </button>
              </form>
            </div>
          </div>
        )}

        {activeModal === 'savings' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">
                  {savingsData.action === 'deposit' ? 'Deposit to Vault' : 'Withdraw from Vault'}
                </h3>
                <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={executeSavings} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount ({CURRENCIES[currency]?.symbol || '$'})</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
                    onChange={(e) => setSavingsData({...savingsData, amount: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-amber-600 font-bold py-3 rounded-xl text-xs mt-2">
                  {savingsData.action === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                </button>
              </form>
            </div>
          </div>
        )}

        {selectedReceipt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-base">Transaction Receipt</h3>
                <p className="text-xs text-slate-400">Reliance Foundation Global</p>
              </div>

              <div className="text-2xl font-extrabold my-2 text-white">
                {formatMoney(Math.abs(selectedReceipt.amount))}
              </div>

              <div className="bg-slate-800/50 rounded-xl p-3 text-left space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="font-semibold">{selectedReceipt.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Description</span><span className="font-semibold">{selectedReceipt.title}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reference</span><span className="font-mono font-semibold">{selectedReceipt.ref}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="text-emerald-400 font-semibold">{selectedReceipt.status}</span></div>
              </div>

              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Close Receipt
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
