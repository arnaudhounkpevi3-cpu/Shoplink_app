// Test API automatisé pour ShopLink
const http = require('http');

const API_BASE = 'http://localhost:5000';
let testResults = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} - ${name}${details ? ': ' + details : ''}`);
  testResults.push({ name, passed, details });
}

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testHealthCheck() {
  try {
    const res = await makeRequest('/api/health', 'GET');
    logTest('Health Check', res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    logTest('Health Check', false, e.message);
  }
}

async function testApiRoot() {
  try {
    const res = await makeRequest('/', 'GET');
    logTest('API Root', res.status === 200, `Status: ${res.status}, Name: ${res.data?.name}`);
  } catch (e) {
    logTest('API Root', false, e.message);
  }
}

async function testUserRegistration() {
  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@shoplink.bj`,
    phone: '+22967163481',
    password: 'Test123456',
    activityType: 'boutique',
    shopName: `Boutique Test ${timestamp}`,
    slogan: 'Test boutique',
    city: 'Cotonou'
  };

  try {
    const res = await makeRequest('/api/auth/register', 'POST', testUser);
    logTest('User Registration', res.status === 201 || res.status === 200, `Status: ${res.status}`);
    
    if (res.data.token) {
      console.log(`  Token: ${res.data.token.substring(0, 20)}...`);
      return res.data.token;
    }
  } catch (e) {
    logTest('User Registration', false, e.message);
  }
  return null;
}

async function testUserLogin() {
  try {
    const res = await makeRequest('/api/auth/login', 'POST', {
      email: 'test@commercant.bj',
      password: 'test123'
    });
    logTest('User Login (Demo)', res.status === 200 || res.status === 201, `Status: ${res.status}`);
    
    if (res.data.token) {
      console.log(`  Token: ${res.data.token.substring(0, 20)}...`);
      return res.data.token;
    }
  } catch (e) {
    logTest('User Login (Demo)', false, e.message);
  }
  return null;
}

async function testPaymentInitiation(token) {
  const paymentData = {
    userId: 'test-user',
    name: 'Test Payment',
    phone: '+22967163481',
    email: 'test@shoplink.bj',
    type: 'autonome',
    step: 'full',
    amount: 4000,
    method: 'mtn',
    reference: 'TEST123'
  };

  try {
    const res = await makeRequest('/api/payments/initiate', 'POST', paymentData);
    logTest('Payment Initiation', res.status === 201 || res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    logTest('Payment Initiation', false, e.message);
  }
}

async function testGetPayments() {
  try {
    const res = await makeRequest('/api/payments', 'GET');
    logTest('Get Payments', res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    logTest('Get Payments', false, e.message);
  }
}

async function testSitesEndpoint() {
  try {
    const res = await makeRequest('/api/sites', 'GET');
    logTest('Get Sites', res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    logTest('Get Sites', false, e.message);
  }
}

async function runTests() {
  console.log('=== DÉBUT DES TESTS API AUTOMATISÉS ===\n');
  
  await testApiRoot();
  await testHealthCheck();
  await testSitesEndpoint();
  await testGetPayments();
  await testUserLogin();
  const token = await testUserRegistration();
  if (token) {
    await testPaymentInitiation(token);
  }
  
  console.log('\n=== RÉSUMÉ DES TESTS ===');
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  console.log(`✓ Réussis: ${passed}`);
  console.log(`✗ Échoués: ${failed}`);
  console.log(`Total: ${testResults.length}`);
}

runTests().catch(console.error);
