const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');

const PLANS = {
  Starter: { name: 'Starter Plan', price: 1500, customerLimit: 500, userLimit: 1 },
  Business: { name: 'Business Plan', price: 3500, customerLimit: 5000, userLimit: 5 },
  Enterprise: { name: 'Enterprise Plan', price: 7500, customerLimit: Infinity, userLimit: Infinity }
};

const CREDIT_PACKAGES = {
  1000: { credits: 1000, price: 2500, name: '1,000 SMS Credits' },
  5000: { credits: 5000, price: 11500, name: '5,000 SMS Credits' },
  10000: { credits: 10000, price: 22000, name: '10,000 SMS Credits' }
};

// GET /api/billing/status - Get subscription status & wallet balance
router.get('/status', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const tenant = await dbQuery.get('SELECT plan, status FROM tenants WHERE id = ?', [tenantId]);
    const wallet = await dbQuery.get('SELECT balance, last_topup FROM credit_wallet WHERE tenant_id = ?', [tenantId]);
    
    const customerCount = await dbQuery.get('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?', [tenantId]);
    const userCount = await dbQuery.get('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?', [tenantId]);

    const activePlan = PLANS[tenant.plan] || PLANS.Starter;

    res.json({
      plan: tenant.plan,
      planDetails: activePlan,
      status: tenant.status,
      balance: wallet ? wallet.balance : 0.0,
      lastTopup: wallet ? wallet.last_topup : null,
      usage: {
        customers: customerCount.count,
        users: userCount.count
      }
    });
  } catch (err) {
    console.error('Fetch billing status error:', err);
    res.status(500).json({ error: 'Failed to retrieve billing settings' });
  }
});

// POST /api/billing/change-plan - Simulate subscribing to a plan
router.post('/change-plan', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    await dbQuery.run('UPDATE tenants SET plan = ? WHERE id = ?', [plan, tenantId]);
    
    // Log transaction
    const price = PLANS[plan].price;
    await dbQuery.run(
      'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
      [tenantId, 0, 'Subscription', `Upgraded to ${plan} Plan (Rs. ${price}/mo)`]
    );

    res.json({ 
      message: `Successfully changed plan to ${plan}`,
      plan: plan
    });
  } catch (err) {
    console.error('Update subscription plan error:', err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// POST /api/billing/topup - Purchase credits (Rs 2,500, Rs 11,500, Rs 22,000)
router.post('/topup', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { credits } = req.body;

  const pkg = CREDIT_PACKAGES[credits];
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid top-up quantity selected. Supported: 1000, 5000, 10000.' });
  }

  try {
    // 1. Topup the wallet balance
    await dbQuery.run(
      `INSERT INTO credit_wallet (tenant_id, balance, last_topup) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tenant_id) DO UPDATE SET balance = balance + ?, last_topup = CURRENT_TIMESTAMP`,
      [tenantId, pkg.credits, pkg.credits]
    );

    // 2. Log Transaction
    await dbQuery.run(
      'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
      [tenantId, pkg.credits, 'Topup', `Purchased ${pkg.name} for Rs. ${pkg.price}`]
    );

    const updatedWallet = await dbQuery.get('SELECT balance FROM credit_wallet WHERE tenant_id = ?', [tenantId]);

    res.json({
      message: 'Credits purchased successfully',
      addedCredits: pkg.credits,
      price: pkg.price,
      newBalance: updatedWallet ? updatedWallet.balance : 0
    });
  } catch (err) {
    console.error('Purchase top-up credits error:', err);
    res.status(500).json({ error: 'Failed to buy credits' });
  }
});

// GET /api/billing/transactions - Get wallet ledger logs
router.get('/transactions', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const transactions = await dbQuery.all(
      'SELECT * FROM wallet_transactions WHERE tenant_id = ? ORDER BY id DESC LIMIT 50',
      [tenantId]
    );
    res.json(transactions);
  } catch (err) {
    console.error('Fetch wallet transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve wallet transactions' });
  }
});

module.exports = router;
