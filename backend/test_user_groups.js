const BASE_URL = 'http://localhost:5000/api';

async function testGroupsEndpoint() {
  console.log('Testing groups endpoint for user admin@connectbiz.com...');
  try {
    // 1. Log in
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@connectbiz.com',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('Login failed with status:', loginRes.status);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log(`✓ Login successful. Tenant: ${loginData.user.businessName} (ID: ${loginData.user.tenantId})`);

    // 2. Fetch groups
    console.log('Fetching groups...');
    const groupsRes = await fetch(`${BASE_URL}/groups`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`Groups Response Status: ${groupsRes.status}`);
    const groupsData = await groupsRes.json();
    console.log('Groups returned:', JSON.stringify(groupsData, null, 2));

  } catch (err) {
    console.error('Test run failed:', err.message);
  }
}

testGroupsEndpoint();
