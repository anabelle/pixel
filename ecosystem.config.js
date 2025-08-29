module.exports = {
  apps: [
    {
      name: 'lnpixels-api',
      cwd: './lnpixels/api',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'lnpixels-web',
      cwd: './lnpixels/web',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true
    },
    {
      name: 'pixel-agent',
      cwd: './pixel-agent',
      script: 'elizaos',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        // OpenRouter configuration for diverse model usage
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENROUTER_MODEL: 'deepseek/deepseek-r1:free',
        OPENROUTER_LARGE_MODEL: 'deepseek/deepseek-r1:free',
        OPENROUTER_SMALL_MODEL: 'openai/gpt-5-nano',
        OPENROUTER_IMAGE_MODEL: 'mistralai/mistral-medium-3.1',
        // Platform configurations
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
        DISCORD_API_TOKEN: process.env.DISCORD_API_TOKEN,
        NOSTR_PRIVATE_KEY: process.env.NOSTR_PRIVATE_KEY,
        NOSTR_RELAYS: 'wss://relay.damus.io,wss://nos.lol,wss://relay.snort.social'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: './logs/agent-error.log',
      out_file: './logs/agent-out.log',
      log_file: './logs/agent-combined.log',
      time: true,
      // Restart delay for graceful shutdowns
      restart_delay: 5000
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: 'your-vps-ip',
      ref: 'origin/master',
      repo: 'https://github.com/anabelle/pixel.git',
      path: '/home/pixel',
      'pre-deploy-local': '',
      'post-deploy': 'git submodule update --init --recursive && pnpm install && pnpm install:agent && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
