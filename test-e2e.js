#!/usr/bin/env node

/**
 * Test E2E Complet ShopLink
 * Teste tous les endpoints critiques du flux client
 */

const http = require('http');
const querystring = require('querystring');

const API_BASE = 'http://localhost:5000/api';
const timestamp = Date.now();
const testEmail = `test_${timestamp}@shoplink.test`;
const testPassword = 'SecurePassword123!';
const testPhone = '+22997000000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

let testState = {
  userId: null,
  token: null,
  siteId: null,
  paymentId: null,
  results: [],
};

function log(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function header(title) {
  log('cyan', `\n╔════════════════════════════════════════╗`);
  log('cyan', `║  ${title}`);
  log('cyan', `╚════════════════════════════════════════╝\n`);
}

function httpRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { raw: data },
          });
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

async function test1Register() {
  header('TEST 1️⃣ : REGISTRATION');

  const body = {
    name: 'Test User',
    email: testEmail,
    password: testPassword,
    phone: testPhone,
    shopName: 'Test Shop',
    city: 'Cotonou',
    activityType: 'Restaurant',
  };

  try {
    const res = await httpRequest('POST', '/auth/register', body);

    if (res.data.success) {
      log('green', `✅ Compte créé: ${testEmail}`);
      testState.userId = res.data.user.id;
      testState.results.push({ test: 'Register', status: 'PASS', msg: res.data.user.id });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({ test: 'Register', status: 'FAIL', msg: res.data.message });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur réseau: ${e.message}`);
    testState.results.push({ test: 'Register', status: 'FAIL', msg: e.message });
    return false;
  }
}

async function test2Login() {
  header('TEST 2️⃣ : LOGIN');

  const body = {
    email: testEmail,
    password: testPassword,
  };

  try {
    const res = await httpRequest('POST', '/auth/login', body);

    if (res.data.success && res.data.token) {
      log('green', `✅ Login réussi`);
      log('gray', `   Token: ${res.data.token.substring(0, 30)}...`);
      testState.token = res.data.token;
      testState.results.push({ test: 'Login', status: 'PASS', token: 'OK' });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({ test: 'Login', status: 'FAIL', msg: res.data.message });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur: ${e.message}`);
    testState.results.push({ test: 'Login', status: 'FAIL', msg: e.message });
    return false;
  }
}

async function test3CreateSite() {
  header('TEST 3️⃣ : CREATE SITE PREMIUM (DRAFT)');

  const body = {
    name: 'Test Premium Site',
    slogan: 'Mon site de test',
    description: 'Site créé via test E2E',
    whatsapp: testPhone,
    secondaryPhone: '',
    address: 'Cotonou, Bénin',
    activityType: 'Restaurant',
    primaryColor: '#1a5c38',
    secondaryColor: '#f59c1a',
  };

  try {
    const res = await httpRequest('POST', '/sites/create', body, testState.token);

    if (res.data.success && res.data.site) {
      log('green', `✅ Site créé (brouillon)`);
      log('gray', `   Site ID: ${res.data.site.id}`);
      log('gray', `   Slug: ${res.data.site.slug}`);
      testState.siteId = res.data.site.id;
      testState.results.push({ test: 'CreateSite', status: 'PASS', siteId: res.data.site.id });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({ test: 'CreateSite', status: 'FAIL', msg: res.data.message });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur: ${e.message}`);
    testState.results.push({ test: 'CreateSite', status: 'FAIL', msg: e.message });
    return false;
  }
}

async function test4InitiatePayment() {
  header('TEST 4️⃣ : INITIATE PAYMENT (Acompte 50%)');

  const body = {
    userId: testState.userId,
    name: 'Test User',
    phone: testPhone,
    email: testEmail,
    type: 'premium',
    step: 'acompte',
    amount: 5000,
    method: 'mtn',
    reference: 'TEST123',
    siteId: testState.siteId,
    siteName: 'Test Premium Site',
    slogan: 'Mon site de test',
    siteDescription: 'Site créé via test API',
    whatsappNumber: testPhone,
    activityType: 'Restaurant',
  };

  try {
    const res = await httpRequest('POST', '/payments/initiate', body, testState.token);

    if (res.data.success && res.data.payment) {
      log('green', `✅ Paiement initié`);
      log('gray', `   Payment ID: ${res.data.payment.id}`);
      log('gray', `   Montant: ${res.data.payment.amount} FCFA`);
      log('gray', `   Statut: ${res.data.payment.status}`);
      testState.paymentId = res.data.payment.id;
      testState.results.push({
        test: 'InitiatePayment',
        status: 'PASS',
        paymentId: res.data.payment.id,
      });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({
        test: 'InitiatePayment',
        status: 'FAIL',
        msg: res.data.message,
      });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur: ${e.message}`);
    testState.results.push({
      test: 'InitiatePayment',
      status: 'FAIL',
      msg: e.message,
    });
    return false;
  }
}

async function test5ValidatePayment() {
  header('TEST 5️⃣ : VALIDATE PAYMENT (Simulation Moov)');

  const body = {
    paymentId: testState.paymentId,
    phoneNumber: testPhone,
    provider: 'mtn',
  };

  try {
    const res = await httpRequest('POST', '/payments/mobile-money/validate', body);

    log('yellow', `⚠️  Response: ${res.data.message}`);
    testState.results.push({
      test: 'ValidatePayment',
      status: 'INFO',
      msg: res.data.message,
    });
    return true;
  } catch (e) {
    log('yellow', `⚠️  Erreur (normal): ${e.message}`);
    testState.results.push({
      test: 'ValidatePayment',
      status: 'INFO',
      msg: e.message,
    });
    return true;
  }
}

async function test6CheckPaymentStatus() {
  header('TEST 6️⃣ : CHECK PAYMENT STATUS');

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await httpRequest('GET', `/payments/status/${testState.paymentId}`, null, testState.token);

    if (res.data.success && res.data.payment) {
      log('green', `✅ Statut récupéré`);
      log('gray', `   Statut: ${res.data.payment.status}`);
      log('gray', `   Montant: ${res.data.payment.amount} FCFA`);

      if (res.data.payment.status === 'completed') {
        log('green', `✅ PAIEMENT RÉUSSI!`);
      } else if (res.data.payment.status === 'pending') {
        log('yellow', `⏳ Paiement en attente...`);
      }

      testState.results.push({
        test: 'CheckPaymentStatus',
        status: 'PASS',
        paymentStatus: res.data.payment.status,
      });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({
        test: 'CheckPaymentStatus',
        status: 'FAIL',
        msg: res.data.message,
      });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur: ${e.message}`);
    testState.results.push({
      test: 'CheckPaymentStatus',
      status: 'FAIL',
      msg: e.message,
    });
    return false;
  }
}

async function test7CheckSiteStatus() {
  header('TEST 7️⃣ : CHECK SITE STATUS');

  try {
    const res = await httpRequest('GET', `/sites/${testState.siteId}`, null, testState.token);

    if (res.data.success && res.data.site) {
      log('green', `✅ Site récupéré`);
      log('gray', `   Nom: ${res.data.site.name}`);
      log('gray', `   Slug: ${res.data.site.slug}`);
      log('gray', `   Statut: ${res.data.site.status}`);

      if (res.data.site.status === 'published') {
        log('green', `✅ SITE PUBLIÉ!`);
      } else {
        log('yellow', `⏳ Site en ${res.data.site.status}`);
      }

      testState.results.push({
        test: 'CheckSiteStatus',
        status: 'PASS',
        siteStatus: res.data.site.status,
      });
      return true;
    } else {
      log('red', `❌ Erreur: ${res.data.message}`);
      testState.results.push({
        test: 'CheckSiteStatus',
        status: 'FAIL',
        msg: res.data.message,
      });
      return false;
    }
  } catch (e) {
    log('red', `❌ Erreur: ${e.message}`);
    testState.results.push({
      test: 'CheckSiteStatus',
      status: 'FAIL',
      msg: e.message,
    });
    return false;
  }
}

async function printSummary() {
  header('📊 RÉSUMÉ FINAL');

  log('cyan', '┌─ RÉSULTATS DES TESTS ─────────────────────┐');
  testState.results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️ ';
    log('gray', `│`);
    log('gray', `│ ${icon} ${r.test}: ${r.status}`);
    if (r.msg) log('gray', `│    ${r.msg}`);
  });
  log('cyan', '└────────────────────────────────────────────┘');

  log('cyan', '\n✅ DONNÉES DE TEST:');
  log('gray', `   Email: ${testEmail}`);
  log('gray', `   User ID: ${testState.userId}`);
  log('gray', `   Site ID: ${testState.siteId}`);
  log('gray', `   Payment ID: ${testState.paymentId}`);
}

async function runAllTests() {
  log('cyan', `\n╔═══════════════════════════════════════════╗`);
  log('cyan', `║  🧪 TEST E2E SHOPLINK`);
  log('cyan', `║  ${new Date().toLocaleString()}`);
  log('cyan', `╚═══════════════════════════════════════════╝`);

  const tests = [
    { name: '1. Register', fn: test1Register },
    { name: '2. Login', fn: test2Login },
    { name: '3. Create Site', fn: test3CreateSite },
    { name: '4. Initiate Payment', fn: test4InitiatePayment },
    { name: '5. Validate Payment', fn: test5ValidatePayment },
    { name: '6. Check Payment Status', fn: test6CheckPaymentStatus },
    { name: '7. Check Site Status', fn: test7CheckSiteStatus },
  ];

  for (const test of tests) {
    const success = await test.fn();
    if (!success && test.name.includes('Register')) {
      log('red', '\n❌ Test arrêté : Registration échouée');
      break;
    }
  }

  await printSummary();

  log('yellow', '\n📝 PROCHAINE ÉTAPE: Tester depuis le navigateur (HTML forms)');
}

runAllTests().catch((e) => {
  log('red', `\n❌ ERREUR FATALE: ${e.message}`);
  process.exit(1);
});
