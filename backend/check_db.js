const { dbQuery } = require('./database');

async function inspectDb() {
  console.log('=== DATABASE CONTENT INSPECTION ===');
  try {
    const tenants = await dbQuery.all('SELECT * FROM tenants');
    console.log('\n--- Tenants ---');
    console.table(tenants);

    const users = await dbQuery.all('SELECT id, tenant_id, name, email, role FROM users');
    console.log('\n--- Users ---');
    console.table(users);

    const groups = await dbQuery.all('SELECT id, tenant_id, group_name, description FROM customer_groups');
    console.log('\n--- Customer Groups ---');
    console.table(groups);

  } catch (err) {
    console.error('Inspection error:', err.message);
  }
  process.exit(0);
}

inspectDb();
