const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');
const { sendSmsGateway } = require('./gateways');

// Helper to resolve customers from a group ID (static or dynamic)
async function getGroupCustomers(tenantId, groupId) {
  const group = await dbQuery.get('SELECT * FROM customer_groups WHERE id = ? AND tenant_id = ?', [groupId, tenantId]);
  if (!group) return [];

  let query = 'SELECT * FROM customers WHERE tenant_id = ?';
  const params = [tenantId];

  if (group.dynamic_rules) {
    const rule = JSON.parse(group.dynamic_rules);
    if (rule.type === 'birthday_month') {
      query += " AND strftime('%m', birthday) = strftime('%m', 'now')";
    } else if (rule.type === 'outstanding_payments') {
      query += " AND id IN (SELECT customer_id FROM invoices WHERE tenant_id = ? AND status != 'Paid')";
      params.push(tenantId);
    } else if (rule.type === 'no_purchase_days') {
      const days = rule.days || 90;
      query += ` AND id NOT IN (SELECT customer_id FROM invoices WHERE tenant_id = ? AND created_at > datetime('now', '-${days} days'))`;
      params.push(tenantId);
    }
  } else {
    query += ' AND group_id = ?';
    params.push(groupId);
  }

  return await dbQuery.all(query, params);
}

// POST /api/campaigns - Send/Schedule a bulk SMS campaign
router.post('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { campaign_name, message, group_id, provider = 'Ada Global', schedule_time } = req.body;

  if (!campaign_name || !message || !group_id) {
    return res.status(400).json({ error: 'Campaign Name, Message and Target Group are required' });
  }

  try {
    // 1. Fetch target customers
    const customers = await getGroupCustomers(tenantId, group_id);
    if (customers.length === 0) {
      return res.status(400).json({ error: 'Selected customer group is empty' });
    }

    // 2. Check credit balance
    const wallet = await dbQuery.get('SELECT balance FROM credit_wallet WHERE tenant_id = ?', [tenantId]);
    if (!wallet || wallet.balance < customers.length) {
      return res.status(400).json({ 
        error: `Insufficient credits. Campaign requires ${customers.length} credits, but wallet has only ${wallet ? wallet.balance : 0} credits. Please top up.` 
      });
    }

    // 3. Register Campaign
    const campaignStatus = schedule_time ? 'Scheduled' : 'Sent';
    const campaignResult = await dbQuery.run(
      'INSERT INTO sms_campaigns (tenant_id, campaign_name, message, status) VALUES (?, ?, ?, ?)',
      [tenantId, campaign_name, message, campaignStatus]
    );
    const campaignId = campaignResult.lastID;

    // If scheduled, stop here and let background scheduler pick it up later
    if (schedule_time) {
      return res.status(202).json({
        message: 'Campaign scheduled successfully',
        campaignId,
        recipientCount: customers.length,
        status: 'Scheduled'
      });
    }

    // 4. Process instant sends
    let successCount = 0;
    let failCount = 0;

    for (const customer of customers) {
      if (!customer.mobile) {
        failCount++;
        // Log skip/fail
        await dbQuery.run(
          'INSERT INTO sms_logs (tenant_id, campaign_id, customer_id, mobile, status) VALUES (?, ?, ?, ?, ?)',
          [tenantId, campaignId, customer.id, 'N/A', 'Failed']
        );
        continue;
      }

      // Personalize message: Dear {NAME} -> Dear John Doe
      let personalizedMsg = message.replace(/{NAME}/g, customer.name || 'Customer');
      personalizedMsg = personalizedMsg.replace(/{MOBILE}/g, customer.mobile || '');
      personalizedMsg = personalizedMsg.replace(/{EMAIL}/g, customer.email || '');

      try {
        const sendResult = await sendSmsGateway(provider, customer.mobile, personalizedMsg);
        
        // Log result
        await dbQuery.run(
          'INSERT INTO sms_logs (tenant_id, campaign_id, customer_id, mobile, status) VALUES (?, ?, ?, ?, ?)',
          [tenantId, campaignId, customer.id, customer.mobile, sendResult.status]
        );

        if (sendResult.status === 'Delivered') {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error sending SMS to ${customer.mobile}:`, err);
        failCount++;
        await dbQuery.run(
          'INSERT INTO sms_logs (tenant_id, campaign_id, customer_id, mobile, status) VALUES (?, ?, ?, ?, ?)',
          [tenantId, campaignId, customer.id, customer.mobile, 'Failed']
        );
      }
    }

    // 5. Deduct credits (1 credit per target message sent)
    const cost = customers.length;
    await dbQuery.run(
      'UPDATE credit_wallet SET balance = balance - ? WHERE tenant_id = ?',
      [cost, tenantId]
    );

    // Record wallet transaction
    await dbQuery.run(
      'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
      [tenantId, -cost, 'Deduction', `Campaign ID ${campaignId}: ${campaign_name}`]
    );

    res.json({
      message: 'Campaign processed successfully',
      campaignId,
      totalRecipients: customers.length,
      successCount,
      failCount,
      creditsDeducted: cost
    });

  } catch (err) {
    console.error('Campaign creation/sending error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// GET /api/campaigns - List campaigns for the current tenant
router.get('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const campaigns = await dbQuery.all(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM sms_logs WHERE campaign_id = c.id AND status = 'Delivered') as delivered_count,
             (SELECT COUNT(*) FROM sms_logs WHERE campaign_id = c.id AND status = 'Failed') as failed_count,
             (SELECT COUNT(*) FROM sms_logs WHERE campaign_id = c.id) as total_count
      FROM sms_campaigns c
      WHERE c.tenant_id = ? 
      ORDER BY c.id DESC
    `, [tenantId]);

    res.json(campaigns);
  } catch (err) {
    console.error('Fetch campaigns error:', err);
    res.status(500).json({ error: 'Failed to retrieve campaigns' });
  }
});

// GET /api/campaigns/logs - Retrieve SMS sending logs for a tenant
router.get('/logs', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { limit = 100, offset = 0 } = req.query;

  try {
    const logs = await dbQuery.all(
      `SELECT l.*, c.name as customer_name, cmp.campaign_name 
       FROM sms_logs l
       LEFT JOIN customers c ON l.customer_id = c.id
       LEFT JOIN sms_campaigns cmp ON l.campaign_id = cmp.id
       WHERE l.tenant_id = ? 
       ORDER BY l.id DESC 
       LIMIT ? OFFSET ?`,
      [tenantId, Number(limit), Number(offset)]
    );
    res.json(logs);
  } catch (err) {
    console.error('Fetch SMS logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve SMS delivery logs' });
  }
});

module.exports = router;
