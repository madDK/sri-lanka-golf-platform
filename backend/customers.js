const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { dbQuery } = require('./database');
const { authenticateToken } = require('./auth');

// Multer in-memory storage configuration
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/customers - Get all customers with search and pagination
router.get('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { search, group_id, customer_type, limit = 50, offset = 0 } = req.query;

  let query = 'SELECT c.*, g.group_name FROM customers c LEFT JOIN customer_groups g ON c.group_id = g.id WHERE c.tenant_id = ?';
  const params = [tenantId];

  if (search) {
    query += ' AND (c.name LIKE ? OR c.mobile LIKE ? OR c.whatsapp LIKE ? OR c.email LIKE ? OR c.id LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (group_id) {
    query += ' AND c.group_id = ?';
    params.push(group_id);
  }

  if (customer_type) {
    query += ' AND c.notes LIKE ?'; // Can be customized
    params.push(`%${customer_type}%`);
  }

  query += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  try {
    const customers = await dbQuery.all(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?';
    const countParams = [tenantId];
    if (search) {
      countQuery += ' AND (name LIKE ? OR mobile LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR id LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (group_id) {
      countQuery += ' AND group_id = ?';
      countParams.push(group_id);
    }
    const countResult = await dbQuery.get(countQuery, countParams);

    res.json({
      customers,
      total: countResult ? countResult.count : 0
    });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to retrieve customers' });
  }
});

// GET /api/customers/:id - Retrieve single customer details
router.get('/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const customerId = req.params.id;

  try {
    const customer = await dbQuery.get('SELECT * FROM customers WHERE id = ? AND tenant_id = ?', [customerId, tenantId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    console.error('Fetch customer by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers - Add a single customer
router.post('/', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { name, mobile, whatsapp, email, birthday, address, group_id, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer Name is required' });
  }

  try {
    // Check tenant limit based on plan
    const tenant = await dbQuery.get('SELECT plan FROM tenants WHERE id = ?', [tenantId]);
    const customerCount = await dbQuery.get('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?', [tenantId]);
    
    const limitMap = { Starter: 500, Business: 5000, Enterprise: Infinity };
    const maxCustomers = limitMap[tenant.plan] || 500;

    if (customerCount.count >= maxCustomers) {
      return res.status(400).json({ error: `Customer limit reached for plan: ${tenant.plan}. Maximum is ${maxCustomers}.` });
    }

    const result = await dbQuery.run(
      `INSERT INTO customers (tenant_id, name, mobile, whatsapp, email, birthday, address, group_id, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, name, mobile, whatsapp, email, birthday, address, group_id || null, notes]
    );

    res.status(201).json({
      message: 'Customer added successfully',
      customerId: result.lastID
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id - Update single customer details
router.put('/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const customerId = req.params.id;
  const { name, mobile, whatsapp, email, birthday, address, group_id, notes } = req.body;

  try {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE id = ? AND tenant_id = ?', [customerId, tenantId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await dbQuery.run(
      `UPDATE customers 
       SET name = ?, mobile = ?, whatsapp = ?, email = ?, birthday = ?, address = ?, group_id = ?, notes = ? 
       WHERE id = ? AND tenant_id = ?`,
      [name, mobile, whatsapp, email, birthday, address, group_id || null, notes, customerId, tenantId]
    );

    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const customerId = req.params.id;

  try {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE id = ? AND tenant_id = ?', [customerId, tenantId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await dbQuery.run('DELETE FROM customers WHERE id = ? AND tenant_id = ?', [customerId, tenantId]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// POST /api/customers/import - Import customers from Excel/CSV file
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  const tenantId = req.user.tenant_id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read spreadsheet using XLSX
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Uploaded sheet is empty' });
    }

    // Tenant check
    const tenant = await dbQuery.get('SELECT plan FROM tenants WHERE id = ?', [tenantId]);
    const customerCountResult = await dbQuery.get('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?', [tenantId]);
    let currentCount = customerCountResult.count;
    
    const limitMap = { Starter: 500, Business: 5000, Enterprise: Infinity };
    const maxCustomers = limitMap[tenant.plan] || 500;

    let importedCount = 0;
    let skippedCount = 0;

    // Cache groups to avoid frequent DB hits
    const groupsList = await dbQuery.all('SELECT id, group_name FROM customer_groups WHERE tenant_id = ?', [tenantId]);
    const groupMap = {};
    groupsList.forEach(g => {
      groupMap[g.group_name.toLowerCase()] = g.id;
    });

    for (const row of data) {
      // Map properties with multiple possible headers
      const name = row.Name || row.name || row['Customer Name'] || row.Name || '';
      const mobileRaw = row.Mobile || row.mobile || row['Mobile Number'] || row.Phone || row.phone || '';
      const mobile = String(mobileRaw).trim();
      const whatsappRaw = row.WhatsApp || row.whatsapp || row['WhatsApp Number'] || mobile;
      const whatsapp = String(whatsappRaw).trim();
      const email = row.Email || row.email || '';
      const birthday = row.Birthday || row.birthday || row['DOB'] || ''; // Format YYYY-MM-DD
      const address = row.Address || row.address || '';
      const groupName = row.Group || row.group || row['Customer Group'] || '';
      const notes = row.Notes || row.notes || '';

      if (!name || !mobile) {
        skippedCount++;
        continue; // Skip invalid rows
      }

      if (currentCount >= maxCustomers) {
        // Stop importing if plan limit reached
        break;
      }

      // Check or create Group
      let groupId = null;
      if (groupName) {
        const cleanGroupName = groupName.trim();
        const lowerGroupName = cleanGroupName.toLowerCase();
        
        if (groupMap[lowerGroupName]) {
          groupId = groupMap[lowerGroupName];
        } else {
          // Create Group on the fly
          const groupResult = await dbQuery.run(
            'INSERT INTO customer_groups (tenant_id, group_name, description) VALUES (?, ?, ?)',
            [tenantId, cleanGroupName, 'Imported group']
          );
          groupId = groupResult.lastID;
          groupMap[lowerGroupName] = groupId;
        }
      }

      // Insert customer
      await dbQuery.run(
        `INSERT INTO customers (tenant_id, name, mobile, whatsapp, email, birthday, address, group_id, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, name, mobile, whatsapp, email, birthday, address, groupId, notes]
      );
      
      currentCount++;
      importedCount++;
    }

    res.json({
      message: `Import completed. Successfully imported ${importedCount} customers, skipped ${skippedCount}.`,
      importedCount,
      skippedCount
    });

  } catch (err) {
    console.error('Import spreadsheet error:', err);
    res.status(500).json({ error: 'Failed to parse file or import customers' });
  }
});

// GET /api/customers/export - Export customers to CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const customers = await dbQuery.all(
      `SELECT c.id, c.name, c.mobile, c.whatsapp, c.email, c.birthday, c.address, c.notes, g.group_name 
       FROM customers c 
       LEFT JOIN customer_groups g ON c.group_id = g.id 
       WHERE c.tenant_id = ? 
       ORDER BY c.id ASC`,
      [tenantId]
    );

    let csvContent = 'ID,Name,Mobile,WhatsApp,Email,Birthday,Address,Group,Notes\n';
    customers.forEach(c => {
      const row = [
        c.id,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.mobile || '',
        c.whatsapp || '',
        c.email || '',
        c.birthday || '',
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.group_name || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
    res.status(200).send(csvContent);

  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export customer database' });
  }
});

module.exports = router;
