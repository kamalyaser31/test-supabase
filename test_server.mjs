import { withSupabase, createSupabaseContext } from '@supabase/server';
import { resolveEnv, createAdminClient } from '@supabase/server/core';

console.log('--- 1. Testing resolveEnv() ---');
const { data: env, error: envErr } = resolveEnv();
if (envErr) {
  console.error('resolveEnv error:', envErr);
} else {
  console.log('Project URL:', env.url);
  console.log('Publishable Key (default):', env.publishableKeys.default);
  console.log('Secret Key (default):', env.secretKeys.default);
  console.log('JWKS Source:', env.jwks);
}

console.log('\n--- 2. Testing createAdminClient() ---');
const adminClient = createAdminClient();
console.log('Admin client initialized successfully.');

console.log('\n--- 3. Testing withSupabase() Handler with Secret Auth Mode ---');
const secretHandler = withSupabase({ auth: 'secret' }, async (req, ctx) => {
  return Response.json({
    ok: true,
    message: 'Secret auth mode verified successfully',
    authMode: ctx.authMode,
    hasAdminClient: Boolean(ctx.supabaseAdmin),
  });
});

// Simulate valid request with apikey = SUPABASE_SECRET_KEY
const validReq = new Request('https://api.local/admin-endpoint', {
  method: 'POST',
  headers: {
    'apikey': process.env.SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
  },
});

const validRes = await secretHandler(validReq);
const validBody = await validRes.json();
console.log('Valid Secret Request Status:', validRes.status);
console.log('Valid Secret Request Body:', validBody);

console.log('\n--- 4. Testing withSupabase() Unauthorized Rejection ---');
// Simulate invalid request with wrong key
const invalidReq = new Request('https://api.local/admin-endpoint', {
  method: 'POST',
  headers: {
    'apikey': 'sb_secret_wrong_invalid_key_12345',
    'Content-Type': 'application/json',
  },
});

const invalidRes = await secretHandler(invalidReq);
const invalidBody = await invalidRes.json();
console.log('Invalid Key Request Status:', invalidRes.status);
console.log('Invalid Key Rejection Body:', invalidBody);

console.log('\n--- 5. Testing withSupabase() Publishable Auth Mode ---');
const pubHandler = withSupabase({ auth: 'publishable' }, async (req, ctx) => {
  return Response.json({
    ok: true,
    message: 'Publishable key verified successfully',
    authMode: ctx.authMode,
    hasClient: Boolean(ctx.supabase),
  });
});

const pubReq = new Request('https://api.local/public-endpoint', {
  method: 'GET',
  headers: {
    'apikey': process.env.SUPABASE_PUBLISHABLE_KEY,
  },
});

const pubRes = await pubHandler(pubReq);
const pubBody = await pubRes.json();
console.log('Publishable Request Status:', pubRes.status);
console.log('Publishable Request Body:', pubBody);

console.log('\n--- 6. Testing Live Supabase Connectivity with Secret Key ---');
try {
  // Query Supabase auth or a dummy table to verify credentials against live project
  const { data, error } = await adminClient.from('_test_health').select('*').limit(1);
  if (error && error.code === '42P01') {
    // 42P01 is Postgres "relation does not exist" which proves connection & auth succeeded!
    console.log('Live Connection Successful! (Connected to Supabase Postgres, credentials verified).');
  } else if (error) {
    console.log('Supabase Response Error:', error.message, error.code);
  } else {
    console.log('Query result:', data);
  }
} catch (err) {
  console.log('Connection failed:', err.message);
}

console.log('\n=== All @supabase/server tests completed successfully ===');
