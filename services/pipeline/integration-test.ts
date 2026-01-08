#!/usr/bin/env bun
import pg from 'pg';

const { Client } = pg;

const CONFIG = {
  POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/pixel_agent',
  CORRELATOR_URL: 'http://localhost:3004/correlations/analyze',
  API_URL: 'http://localhost:3000/api',
};

async function testDBConnection(): Promise<boolean> {
  try {
    const client = new Client({ connectionString: CONFIG.POSTGRES_URL });
    await client.connect();
    const result = await client.query('SELECT 1 as test');
    await client.end();
    console.log('✅ PostgreSQL connection successful');
    return true;
  } catch (error: any) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function testCorrelatorEndpoint(): Promise<boolean> {
  try {
    const response = await fetch(CONFIG.CORRELATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narratives: [
          {
            id: 'test-1',
            tags: ['test'],
            content: 'Test narrative',
            importance: 'low',
          },
        ],
        economicEvents: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Correlator endpoint successful');
    return true;
  } catch (error: any) {
    console.log('❌ Correlator endpoint failed:', error.message);
    return false;
  }
}

async function testAPIEndpoint(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.API_URL}/activity?limit=1`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    console.log('✅ API endpoint successful');
    return true;
  } catch (error: any) {
    console.log('❌ API endpoint failed:', error.message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('Running integration tests for narrative correlator bridge...\n');

  const dbOk = await testDBConnection();
  const correlatorOk = await testCorrelatorEndpoint();
  const apiOk = await testAPIEndpoint();

  console.log('\n=== Test Summary ===');
  console.log(`PostgreSQL: ${dbOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Correlator: ${correlatorOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API: ${apiOk ? '✅ PASS' : '❌ FAIL'}`);

  if (dbOk && correlatorOk && apiOk) {
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed - check environment configuration');
    process.exit(1);
  }
}

main();
