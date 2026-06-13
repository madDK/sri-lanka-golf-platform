const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting ConnectBiz E2E Integration Tests...');

  try {
    const testEmail = `test_owner_${Math.random().toString(36).substring(7)}@connectbiz.com`;
    const testPassword = 'password123';
    let token = '';
    let customerId = '';
    let groupId = '';
    let invoiceId = '';

    // 1. Register Tenant & Admin
    console.log('1. Testing Registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test Pharmacy',
        name: 'Jane Admin',
        email: testEmail,
        password: testPassword,
        plan: 'Starter'
      })
    });
    
    assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
    const regData = await regRes.json();
    assert.ok(regData.token, 'Registration should return a JWT token');
    token = regData.token;
    console.log('   ✓ Registration OK');

    // 2. Login User
    console.log('2. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Login should return 200 OK');
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.user.email, testEmail, 'Logged in user email should match');
    console.log('   ✓ Login OK');

    // 3. Create Group
    console.log('3. Testing Group Creation...');
    const groupRes = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        group_name: 'VIP Regulars',
        description: 'High loyalty score clients'
      })
    });
    assert.strictEqual(groupRes.status, 201, 'Group creation should return 201 Created');
    const groupData = await groupRes.json();
    assert.ok(groupData.groupId, 'Should return created groupId');
    groupId = groupData.groupId;
    console.log('   ✓ Group Creation OK');

    // 4. Add Customer
    console.log('4. Testing Customer Creation...');
    const todayStr = new Date().toISOString().substring(0, 10);
    const customerRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'John Silva',
        mobile: '0779998887',
        whatsapp: '0779998887',
        email: 'john.silva@gmail.com',
        birthday: todayStr, // Today!
        address: 'Galle Road, Colombo 3',
        group_id: groupId,
        notes: 'VIP Retail'
      })
    });
    assert.strictEqual(customerRes.status, 201, 'Customer creation should return 201');
    const customerData = await customerRes.json();
    assert.ok(customerData.customerId, 'Should return customerId');
    customerId = customerData.customerId;
    console.log('   ✓ Customer Creation OK');

    // 5. Create Test Invoice (Due today to trigger reminder)
    console.log('5. Testing Invoice Generation...');
    const invRes = await fetch(`${BASE_URL}/automations/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_id: customerId,
        amount: 4500.0,
        due_date: todayStr // Due today!
      })
    });
    assert.strictEqual(invRes.status, 201, 'Invoice creation should return 201');
    const invData = await invRes.json();
    invoiceId = invData.invoiceId;
    console.log('   ✓ Invoice Generation OK');

    // 6. Trigger Automations Scheduler
    console.log('6. Testing Automation Trigger...');
    const triggerRes = await fetch(`${BASE_URL}/automations/trigger`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(triggerRes.status, 200, 'Trigger automation should return 200 OK');
    const triggerData = await triggerRes.json();
    assert.ok(triggerData.report, 'Response should contain execution report');
    
    // John Silva matches both birthday today AND invoice due today
    assert.strictEqual(triggerData.report.birthdaysProcessed, 1, 'Should find 1 matching birthday');
    assert.strictEqual(triggerData.report.remindersProcessed, 1, 'Should find 1 matching due reminder');
    console.log('   ✓ Automation Trigger OK (Report confirms SMS/WhatsApp logs created)');

    // 7. Check Dashboard Stats
    console.log('7. Testing Dashboard Stats Aggregation...');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(statsRes.status, 200, 'Stats endpoint should return 200');
    const statsData = await statsRes.json();
    
    assert.strictEqual(statsData.stats.totalCustomers, 1, 'Should reflect 1 customer');
    assert.strictEqual(statsData.stats.todayBirthdays, 1, 'Should reflect 1 birthday today');
    assert.ok(statsData.stats.smsSent > 0, 'Should have sent auto SMS');
    assert.ok(statsData.stats.whatsappSent > 0, 'Should have sent auto WhatsApp');
    console.log('   ✓ Dashboard Stats Aggregation OK');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
