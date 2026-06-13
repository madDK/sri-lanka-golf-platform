const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');

// GET /api/groups - List all groups for a tenant
router.get('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const groups = await dbQuery.all('SELECT * FROM customer_groups WHERE tenant_id = ? ORDER BY id DESC', [tenantId]);
    
    // For each group, get customer counts (if static or dynamic)
    const enrichedGroups = await Promise.all(groups.map(async (group) => {
      let customerCount = 0;
      if (group.dynamic_rules) {
        // Dynamic group: count based on query rules
        const rule = JSON.parse(group.dynamic_rules);
        let countSql = 'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?';
        const params = [tenantId];

        if (rule.type === 'birthday_month') {
          countSql += " AND strftime('%m', birthday) = strftime('%m', 'now')";
        } else if (rule.type === 'outstanding_payments') {
          countSql += " AND id IN (SELECT customer_id FROM invoices WHERE tenant_id = ? AND status != 'Paid')";
          params.push(tenantId);
        } else if (rule.type === 'no_purchase_days') {
          const days = rule.days || 90;
          countSql += ` AND id NOT IN (SELECT customer_id FROM invoices WHERE tenant_id = ? AND created_at > datetime('now', '-${days} days'))`;
          params.push(tenantId);
        }

        const resCount = await dbQuery.get(countSql, params);
        customerCount = resCount ? resCount.count : 0;
      } else {
        // Static group: count direct relations
        const resCount = await dbQuery.get('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ? AND group_id = ?', [tenantId, group.id]);
        customerCount = resCount ? resCount.count : 0;
      }
      return { ...group, customer_count: customerCount };
    }));

    res.json(enrichedGroups);
  } catch (err) {
    console.error('Fetch groups error:', err);
    res.status(500).json({ error: 'Failed to retrieve groups' });
  }
});

// GET /api/groups/:id/customers - Retrieve customers belonging to this group
router.get('/:id/customers', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const groupId = req.params.id;

  try {
    const group = await dbQuery.get('SELECT * FROM customer_groups WHERE id = ? AND tenant_id = ?', [groupId, tenantId]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

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

    const customers = await dbQuery.all(query, params);
    res.json(customers);
  } catch (err) {
    console.error('Fetch group customers error:', err);
    res.status(500).json({ error: 'Failed to fetch group customers' });
  }
});

// POST /api/groups - Create customer group
router.post('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { group_name, description, dynamic_rules } = req.body;

  if (!group_name) {
    return res.status(400).json({ error: 'Group Name is required' });
  }

  try {
    const result = await dbQuery.run(
      'INSERT INTO customer_groups (tenant_id, group_name, description, dynamic_rules) VALUES (?, ?, ?, ?)',
      [tenantId, group_name, description, dynamic_rules ? JSON.stringify(dynamic_rules) : null]
    );

    res.status(201).json({
      message: 'Group created successfully',
      groupId: result.lastID
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/groups/:id - Update group details
router.put('/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const groupId = req.params.id;
  const { group_name, description, dynamic_rules } = req.body;

  try {
    const group = await dbQuery.get('SELECT id FROM customer_groups WHERE id = ? AND tenant_id = ?', [groupId, tenantId]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await dbQuery.run(
      'UPDATE customer_groups SET group_name = ?, description = ?, dynamic_rules = ? WHERE id = ? AND tenant_id = ?',
      [group_name, description, dynamic_rules ? JSON.stringify(dynamic_rules) : null, groupId, tenantId]
    );

    res.json({ message: 'Group updated successfully' });
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const groupId = req.params.id;

  try {
    const group = await dbQuery.get('SELECT id FROM customer_groups WHERE id = ? AND tenant_id = ?', [groupId, tenantId]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Set customers' group_id to null for members of this group
    await dbQuery.run('UPDATE customers SET group_id = NULL WHERE group_id = ? AND tenant_id = ?', [groupId, tenantId]);

    // Delete group
    await dbQuery.run('DELETE FROM customer_groups WHERE id = ? AND tenant_id = ?', [groupId, tenantId]);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
