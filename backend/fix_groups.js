const { dbQuery } = require('./database');

async function repairExistingTenants() {
  console.log('⚡ Repairing existing tenant group records...');
  
  try {
    // 1. Fetch all tenants
    const tenants = await dbQuery.all('SELECT id, name FROM tenants');
    console.log(`Found ${tenants.length} tenants in database.`);

    for (const t of tenants) {
      // 2. Check if this tenant has any groups
      const existingGroups = await dbQuery.all('SELECT id FROM customer_groups WHERE tenant_id = ?', [t.id]);
      
      if (existingGroups.length === 0) {
        console.log(`   -> Tenant #${t.id} (${t.name}) has 0 groups. Retrofitting defaults...`);
        
        // Seed VIP Customers
        await dbQuery.run(
          'INSERT INTO customer_groups (tenant_id, group_name, description) VALUES (?, ?, ?)',
          [t.id, 'VIP Customers', 'High-loyalty customers for special promotions']
        );
        
        // Seed Birthday This Month
        await dbQuery.run(
          'INSERT INTO customer_groups (tenant_id, group_name, description, dynamic_rules) VALUES (?, ?, ?, ?)',
          [t.id, 'Birthday This Month', 'Customers who celebrate their birthday in the current month', JSON.stringify({ type: 'birthday_month' })]
        );
        
        // Seed Outstanding Payments
        await dbQuery.run(
          'INSERT INTO customer_groups (tenant_id, group_name, description, dynamic_rules) VALUES (?, ?, ?, ?)',
          [t.id, 'Outstanding Payments', 'Customers with pending or overdue unpaid invoices', JSON.stringify({ type: 'outstanding_payments' })]
        );
      } else {
        console.log(`   -> Tenant #${t.id} (${t.name}) already has ${existingGroups.length} groups. Skipping.`);
      }
    }

    console.log('✓ Repair completed successfully!');
  } catch (err) {
    console.error('Error during groups repair:', err.message);
  }
  process.exit(0);
}

repairExistingTenants();
