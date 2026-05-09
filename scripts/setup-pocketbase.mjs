#!/usr/bin/env node
/**
 * Creates all 9 G-Trade collections in PocketBase.
 * Usage: node scripts/setup-pocketbase.mjs <email> <password>
 */

const PB_URL = 'http://127.0.0.1:8090';
const [,, email = 'admin@gtrade.local', password = 'Admin1234!'] = process.argv;

async function api(method, path, body, token) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Authenticate ────────────────────────────────────────────────────────────
console.log('Authenticating...');
const authRes = await api('POST', '/api/collections/_superusers/auth-with-password', {
  identity: email,
  password,
});
if (!authRes.token) {
  console.error('Auth failed:', authRes.message);
  process.exit(1);
}
const TOKEN = authRes.token;
console.log('Authenticated\n');

// ── Schema ───────────────────────────────────────────────────────────────────
const FIELDS = [
  { name: 'externalId',        type: 'text', required: true  },
  { name: 'data',              type: 'json', required: true,
    options: { maxSize: 5000000 } },
  { name: 'createdAtOriginal', type: 'text', required: false },
  { name: 'updatedAtOriginal', type: 'text', required: false },
];

const COLLECTIONS = [
  'trades',
  'daily_plans',
  'playbook_setups',
  'risk_settings',
  'tags',
  'import_batches',
  'daily_reviews',
  'weekly_reviews',
  'monthly_reviews',
  // Automation platform
  'signals',
  'automation_rules',
  'ai_reviews',
  'execution_records',
  'audit_logs',
];

// ── Create each collection ───────────────────────────────────────────────────
for (const name of COLLECTIONS) {
  // Check if already exists
  const existing = await api('GET', `/api/collections/${name}`, null, TOKEN);
  if (existing.id) {
    console.log(`SKIP  ${name} (already exists)`);
    continue;
  }

  const res = await api('POST', '/api/collections', {
    name,
    type: 'base',
    fields: FIELDS,
  }, TOKEN);

  if (res.id) {
    console.log(`OK    ${name}`);
  } else {
    console.error(`FAIL  ${name} —`, res.message ?? JSON.stringify(res));
  }
}

console.log('\nAll done.');
console.log('Open http://127.0.0.1:8090/_/ to view your collections.');
console.log('Then: G-Trade Settings → Test Connection → Migrate → Switch to PocketBase');
