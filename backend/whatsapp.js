const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');
const { sendWhatsAppGateway } = require('./gateways');

// Predefined WhatsApp Templates (Approved by Meta Sandbox)
const DEFAULT_TEMPLATES = [
  {
    name: 'payment_reminder',
    language: 'en',
    category: 'UTILITY',
    body: 'Hello {{1}},\n\nYour payment of Rs {{2}} is due on {{3}}.\n\nThank you.',
    variables: ['Customer Name', 'Amount', 'Due Date']
  },
  {
    name: 'birthday_wish',
    language: 'en',
    category: 'MARKETING',
    body: 'Happy Birthday {{1}}! 🎂\n\nEnjoy a {{2}}% discount today as a token of our appreciation.\n\nShop at: {{3}}',
    variables: ['Customer Name', 'Discount %', 'Store Name']
  },
  {
    name: 'appointment_reminder',
    language: 'en',
    category: 'UTILITY',
    body: 'Dear {{1}},\n\nThis is a reminder for your appointment on {{2}} at {{3}}.\n\nPlease reply to confirm.',
    variables: ['Customer Name', 'Date', 'Time']
  },
  {
    name: 'promotional_offer',
    language: 'en',
    category: 'MARKETING',
    body: 'Hello {{1}}! 🔥\n\nEnjoy {{2}}% OFF on all items this weekend at {{3}}!\n\nUse Code: {{4}}',
    variables: ['Customer Name', 'Discount %', 'Store Name', 'Promo Code']
  }
];

// GET /api/whatsapp/templates - Get available templates
router.get('/templates', authenticateToken, async (req, res) => {
  res.json(DEFAULT_TEMPLATES);
});

// POST /api/whatsapp/send - Send a template notification
router.post('/send', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { customer_id, template_name, parameters } = req.body;

  if (!customer_id || !template_name || !parameters || !Array.isArray(parameters)) {
    return res.status(400).json({ error: 'Customer ID, Template Name, and Parameters (array) are required' });
  }

  try {
    // 1. Fetch customer
    const customer = await dbQuery.get('SELECT * FROM customers WHERE id = ? AND tenant_id = ?', [customer_id, tenantId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const numberToSend = customer.whatsapp || customer.mobile;
    if (!numberToSend) {
      return res.status(400).json({ error: 'Customer does not have a WhatsApp or mobile number' });
    }

    // 2. Validate template
    const template = DEFAULT_TEMPLATES.find(t => t.name === template_name);
    if (!template) {
      return res.status(400).json({ error: 'Invalid template name' });
    }

    // 3. Check credit balance (1 WhatsApp message = 1 Credit for simplicity)
    const wallet = await dbQuery.get('SELECT balance FROM credit_wallet WHERE tenant_id = ?', [tenantId]);
    if (!wallet || wallet.balance < 1) {
      return res.status(400).json({ error: 'Insufficient credits. WhatsApp notification requires 1 credit.' });
    }

    // 4. Render local body for DB preview
    let renderedBody = template.body;
    parameters.forEach((val, index) => {
      renderedBody = renderedBody.replace(`{{${index + 1}}}`, val);
    });

    // 5. Fire simulated Meta API
    const gatewayRes = await sendWhatsAppGateway(numberToSend, template_name, parameters);

    // 6. Log in DB
    await dbQuery.run(
      'INSERT INTO whatsapp_logs (tenant_id, customer_id, template, status) VALUES (?, ?, ?, ?)',
      [tenantId, customer_id, renderedBody, gatewayRes.status]
    );

    // 7. Deduct credit
    await dbQuery.run(
      'UPDATE credit_wallet SET balance = balance - 1.0 WHERE tenant_id = ?',
      [tenantId]
    );

    // Record wallet transaction
    await dbQuery.run(
      'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
      [tenantId, -1.0, 'Deduction', `WhatsApp template [${template_name}] sent to customer ID ${customer_id}`]
    );

    res.json({
      message: 'WhatsApp message sent successfully',
      status: gatewayRes.status,
      renderedText: renderedBody,
      creditsDeducted: 1.0
    });

  } catch (err) {
    console.error('Send WhatsApp template error:', err);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// GET /api/whatsapp/logs - Get WhatsApp logs for a tenant
router.get('/logs', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { limit = 100, offset = 0 } = req.query;

  try {
    const logs = await dbQuery.all(
      `SELECT l.*, c.name as customer_name, c.whatsapp as whatsapp_number, c.mobile as mobile_number 
       FROM whatsapp_logs l 
       LEFT JOIN customers c ON l.customer_id = c.id
       WHERE l.tenant_id = ? 
       ORDER BY l.id DESC 
       LIMIT ? OFFSET ?`,
      [tenantId, Number(limit), Number(offset)]
    );
    res.json(logs);
  } catch (err) {
    console.error('Fetch WhatsApp logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve WhatsApp delivery logs' });
  }
});

module.exports = router;
