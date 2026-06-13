const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');
const { sendSmsGateway, sendWhatsAppGateway } = require('./gateways');

// Store automation settings (in database or memory - let's write to a settings table later if needed, or maintain default config)
let automationSettings = {
  birthdaySmsTemplate: 'Happy Birthday {NAME}! 🎂 Enjoy 15% discount today at {BUSINESS_NAME}.',
  birthdayWhatsAppTemplate: 'birthday_wish', // template name
  paymentReminderEnabled: true,
  birthdayAutomationEnabled: true
};

// GET /api/automations/settings - Fetch configurations
router.get('/settings', authenticateToken, async (req, res) => {
  res.json(automationSettings);
});

// POST /api/automations/settings - Save configurations
router.post('/settings', authenticateToken, async (req, res) => {
  automationSettings = { ...automationSettings, ...req.body };
  res.json({ message: 'Automation settings updated', settings: automationSettings });
});

// POST /api/automations/trigger - Trigger automation check manually (returns audit report)
router.post('/trigger', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const auditReport = {
    timestamp: new Date().toISOString(),
    birthdaysProcessed: 0,
    birthdaySends: [],
    remindersProcessed: 0,
    reminderSends: []
  };

  try {
    const tenant = await dbQuery.get('SELECT name FROM tenants WHERE id = ?', [tenantId]);
    const wallet = await dbQuery.get('SELECT balance FROM credit_wallet WHERE tenant_id = ?', [tenantId]);
    let creditBalance = wallet ? wallet.balance : 0.0;

    const todayStr = new Date().toISOString().substring(5, 10); // MM-DD
    const todayFullStr = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    const today = new Date(todayFullStr);

    // ==========================================
    // 1. Process Birthdays (Birthday = Today)
    // ==========================================
    if (automationSettings.birthdayAutomationEnabled) {
      const birthdayCustomers = await dbQuery.all(
        `SELECT * FROM customers 
         WHERE tenant_id = ? 
         AND substr(birthday, 6, 5) = ?`,
        [tenantId, todayStr]
      );

      for (const customer of birthdayCustomers) {
        if (creditBalance < 2.0) {
          auditReport.birthdaySends.push({
            customer: customer.name,
            status: 'Failed',
            reason: 'Insufficient credit balance'
          });
          continue;
        }

        // Deduct 2 credits: 1 SMS + 1 WhatsApp (as requested in specifications)
        creditBalance -= 2.0;
        await dbQuery.run('UPDATE credit_wallet SET balance = balance - 2.0 WHERE tenant_id = ?', [tenantId]);
        
        // SMS Send
        let smsText = automationSettings.birthdaySmsTemplate
          .replace(/{NAME}/g, customer.name)
          .replace(/{BUSINESS_NAME}/g, tenant.name);
        
        const smsRes = await sendSmsGateway('Ada Global', customer.mobile, smsText);
        await dbQuery.run(
          'INSERT INTO sms_logs (tenant_id, customer_id, mobile, status) VALUES (?, ?, ?, ?)',
          [tenantId, customer.id, customer.mobile, smsRes.status]
        );

        // WhatsApp Send (Template)
        const waRes = await sendWhatsAppGateway(
          customer.whatsapp || customer.mobile,
          automationSettings.birthdayWhatsAppTemplate,
          [customer.name, '15', tenant.name] // Name, discount percent, company
        );
        await dbQuery.run(
          'INSERT INTO whatsapp_logs (tenant_id, customer_id, template, status) VALUES (?, ?, ?, ?)',
          [tenantId, customer.id, `Birthday Wish Template sent to ${customer.name}`, waRes.status]
        );

        auditReport.birthdaySends.push({
          customer: customer.name,
          mobile: customer.mobile,
          smsStatus: smsRes.status,
          whatsappStatus: waRes.status
        });
        
        auditReport.birthdaysProcessed++;
        
        // Log transactions
        await dbQuery.run(
          'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
          [tenantId, -2.0, 'Deduction', `Auto Birthday wish to ${customer.name}`]
        );
      }
    }

    // ==========================================
    // 2. Process Payment Reminders
    // ==========================================
    if (automationSettings.paymentReminderEnabled) {
      // Fetch all non-paid invoices
      const pendingInvoices = await dbQuery.all(
        `SELECT i.*, c.name as customer_name, c.mobile, c.whatsapp 
         FROM invoices i 
         JOIN customers c ON i.customer_id = c.id
         WHERE i.tenant_id = ? AND i.status != 'Paid'`,
        [tenantId]
      );

      for (const inv of pendingInvoices) {
        const invDueDate = new Date(inv.due_date);
        
        // Difference in calendar days
        const diffTime = invDueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let triggerReminder = false;
        let reminderMsg = '';

        if (diffDays === 7) {
          triggerReminder = true;
          reminderMsg = `Dear ${inv.customer_name}, Your payment of Rs.${inv.amount} is due in 7 days (${inv.due_date}).`;
        } else if (diffDays === 3) {
          triggerReminder = true;
          reminderMsg = `Dear ${inv.customer_name}, Your payment of Rs.${inv.amount} is due in 3 days (${inv.due_date}).`;
        } else if (diffDays === 0) {
          triggerReminder = true;
          reminderMsg = `Dear ${inv.customer_name}, Your payment of Rs.${inv.amount} is due today. Please settle.`;
        } else if (diffDays === -3) {
          triggerReminder = true;
          reminderMsg = `URGENT: Your invoice for Rs.${inv.amount} is overdue by 3 days. Please settle immediately.`;
          
          // Auto update status to Overdue if it is still Pending
          if (inv.status === 'Pending') {
            await dbQuery.run("UPDATE invoices SET status = 'Overdue' WHERE id = ?", [inv.id]);
          }
        }

        if (triggerReminder) {
          if (creditBalance < 1.0) {
            auditReport.reminderSends.push({
              invoiceId: inv.id,
              customer: inv.customer_name,
              status: 'Failed',
              reason: 'Insufficient credit balance'
            });
            continue;
          }

          creditBalance -= 1.0;
          await dbQuery.run('UPDATE credit_wallet SET balance = balance - 1.0 WHERE tenant_id = ?', [tenantId]);

          // Send SMS Reminder
          const smsRes = await sendSmsGateway('Dialog', inv.mobile, reminderMsg);
          await dbQuery.run(
            'INSERT INTO sms_logs (tenant_id, customer_id, mobile, status) VALUES (?, ?, ?, ?)',
            [tenantId, inv.customer_id, inv.mobile, smsRes.status]
          );

          // WhatsApp Reminder (Hello {{1}}, Your payment of Rs {{2}} is due on {{3}})
          const waRes = await sendWhatsAppGateway(
            inv.whatsapp || inv.mobile,
            'payment_reminder',
            [inv.customer_name, inv.amount.toString(), inv.due_date]
          );
          await dbQuery.run(
            'INSERT INTO whatsapp_logs (tenant_id, customer_id, template, status) VALUES (?, ?, ?, ?)',
            [tenantId, inv.customer_id, `Payment reminder for Rs.${inv.amount} due on ${inv.due_date}`, waRes.status]
          );

          auditReport.reminderSends.push({
            invoiceId: inv.id,
            customer: inv.customer_name,
            amount: inv.amount,
            diffDays,
            smsStatus: smsRes.status,
            whatsappStatus: waRes.status
          });

          auditReport.remindersProcessed++;

          // Log transaction
          await dbQuery.run(
            'INSERT INTO wallet_transactions (tenant_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [tenantId, -1.0, 'Deduction', `Auto invoice reminder to ${inv.customer_name}`]
          );
        }
      }
    }

    res.json({
      message: 'Automation execution completed.',
      report: auditReport
    });

  } catch (err) {
    console.error('Trigger automation error:', err);
    res.status(500).json({ error: 'Automation execution failed' });
  }
});

// GET /api/automations/invoices - Helper to list invoices for reminder status monitoring
router.get('/invoices', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const invoices = await dbQuery.all(
      `SELECT i.*, c.name as customer_name, c.mobile 
       FROM invoices i 
       JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = ? 
       ORDER BY i.due_date ASC`,
      [tenantId]
    );
    res.json(invoices);
  } catch (err) {
    console.error('Fetch invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoices list' });
  }
});

// POST /api/automations/invoices - Helper to create an invoice for testing payment reminders
router.post('/invoices', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { customer_id, amount, due_date } = req.body;

  if (!customer_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Customer ID, Amount, and Due Date (YYYY-MM-DD) are required' });
  }

  try {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE id = ? AND tenant_id = ?', [customer_id, tenantId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await dbQuery.run(
      'INSERT INTO invoices (tenant_id, customer_id, amount, due_date) VALUES (?, ?, ?, ?)',
      [tenantId, customer_id, amount, due_date]
    );

    res.status(201).json({
      message: 'Invoice created successfully for reminder testing',
      invoiceId: result.lastID
    });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT /api/automations/invoices/:id - Pay/Resolve invoice
router.put('/invoices/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const invoiceId = req.params.id;
  const { status } = req.body; // 'Paid', 'Pending', 'Overdue'

  try {
    const invoice = await dbQuery.get('SELECT id FROM invoices WHERE id = ? AND tenant_id = ?', [invoiceId, tenantId]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await dbQuery.run(
      'UPDATE invoices SET status = ? WHERE id = ? AND tenant_id = ?',
      [status || 'Paid', invoiceId, tenantId]
    );

    res.json({ message: `Invoice status updated to ${status || 'Paid'}` });
  } catch (err) {
    console.error('Update invoice error:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

module.exports = router;
