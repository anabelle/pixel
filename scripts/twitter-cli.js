#!/usr/bin/env bun

import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/pixel_agent';

interface TwitterProfile {
  userId: string;
  username: string;
  name: string;
  biography?: string;
  avatar?: string;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  location?: string;
  joined?: Date;
}

class TwitterCLI {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: POSTGRES_URL });
  }

  async connect() {
    await this.pool.connect();
  }

  async disconnect() {
    await this.pool.end();
  }

  async testAuth(dryRun: boolean = false): Promise<void> {
    console.log(`[TWITTER CLI] Testing Twitter credentials (dry-run: ${dryRun})`);

    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET_KEY;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const enabled = process.env.ENABLE_TWITTER_PLUGIN !== 'false';

    console.log(`[TWITTER CLI] Plugin enabled: ${enabled}`);

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('[TWITTER CLI] ❌ Twitter credentials not configured');
      console.error('[TWITTER CLI] Required env vars: TWITTER_API_KEY, TWITTER_API_SECRET_KEY, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET');
      process.exit(1);
    }

    if (!enabled) {
      console.warn('[TWITTER CLI] ⚠️  Twitter plugin is disabled via ENABLE_TWITTER_PLUGIN=false');
      console.warn('[TWITTER CLI] Set ENABLE_TWITTER_PLUGIN=true to enable');
      return;
    }

    try {
      const { TwitterApi } = await import('twitter-api-v2');
      const client = new TwitterApi(`${apiKey}:${apiSecret}:${accessToken}:${accessSecret}`);

      console.log('[TWITTER CLI] ✅ Credentials found, attempting authentication...');

      const { data: user } = await client.v2.me({
        "user.fields": ["id", "name", "username", "description", "public_metrics", "verified", "created_at"]
      });

      const profile: TwitterProfile = {
        userId: user.id,
        username: user.username,
        name: user.name,
        biography: user.description,
        followersCount: user.public_metrics?.followers_count,
        followingCount: user.public_metrics?.following_count,
        isVerified: user.verified,
        joined: user.created_at ? new Date(user.created_at) : undefined,
      };

      console.log('\n[TWITTER CLI] ✅ Authentication successful!');
      console.log('\n=== Twitter Account Info ===');
      console.log(`Username: @${profile.username}`);
      console.log(`Name: ${profile.name}`);
      console.log(`User ID: ${profile.userId}`);
      console.log(`Followers: ${profile.followersCount?.toLocaleString()}`);
      console.log(`Following: ${profile.followingCount?.toLocaleString()}`);
      console.log(`Verified: ${profile.isVerified ? '✅' : '❌'}`);
      console.log(`Joined: ${profile.joined?.toISOString()}`);
      console.log('==========================\n');

      if (dryRun) {
        console.log('[TWITTER CLI] 🧪 Dry-run mode: Would NOT post actual content');
        console.log('[TWITTER CLI] 🧪 Dry-run mode: Only logging what would be posted');
      } else {
        console.log('[TWITTER CLI] 🚀 Normal mode: Content WILL be posted to Twitter');
      }

    } catch (error: any) {
      if (error.code === 401 || error.statusCode === 401) {
        console.error('[TWITTER CLI] ❌ Authentication failed (401 Unauthorized)');
        console.error('[TWITTER CLI] Please check your Twitter credentials');
      } else if (error.code === 429 || error.statusCode === 429) {
        console.error('[TWITTER CLI] ⚠️  Rate limited (429)');
        console.error('[TWITTER CLI] Please wait before trying again');
      } else {
        console.error('[TWITTER CLI] ❌ Error:', error.message);
      }
      process.exit(1);
    }
  }

  async logDryRun(content: string): Promise<void> {
    console.log('\n[TWITTER CLI] 🧪 DRY-RUN MODE - Would post the following:');
    console.log('=========================================');
    console.log(content);
    console.log('=========================================');
    console.log('[TWITTER CLI] 🧪 NO actual post made (dry-run active)\n');

    const timestamp = new Date().toISOString();
    await this.pool.query(
      'INSERT INTO diary_entries (id, author, content, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), 'TwitterDryRun', `Would post: ${content}`, ['twitter', 'dry-run'], timestamp, timestamp]
    );
    console.log('[TWITTER CLI] 📝 Logged to diary for reference');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const cli = new TwitterCLI();

  try {
    await cli.connect();

    switch (command) {
      case 'test-auth':
        const dryRun = args.includes('--dry-run') || args.includes('-d');
        await cli.testAuth(dryRun);
        break;

      case 'dry-run-post':
        if (!args[1]) {
          console.error('Usage: twitter-cli dry-run-post <content>');
          process.exit(1);
        }
        await cli.logDryRun(args.slice(1).join(' '));
        break;

      default:
        console.log('Usage: twitter-cli <command> [arguments]');
        console.log('\nCommands:');
        console.log('  test-auth [--dry-run, -d]  - Test Twitter credentials and show account info');
        console.log('  dry-run-post <content>     - Log what would be posted (no actual post)');
        console.log('\nExamples:');
        console.log('  twitter-cli test-auth');
        console.log('  twitter-cli test-auth --dry-run');
        console.log('  twitter-cli dry-run-post "Hello, world!"');
    }
  } finally {
    await cli.disconnect();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
