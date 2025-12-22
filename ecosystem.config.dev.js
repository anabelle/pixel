module.exports = {
  apps: [
    {
      name: 'api',
      script: 'pnpm',
      args: 'dev',
      cwd: './lnpixels/api',
      env: { NODE_ENV: 'development', PORT: 3000 }
    },
    {
      name: 'app',
      script: 'pnpm',
      args: 'dev',
      cwd: './lnpixels/lnpixels-app',
      env: { NODE_ENV: 'development', PORT: 3002 }
    },
    {
      name: 'landing',
      script: 'pnpm',
      args: 'dev',
      cwd: './pixel-landing',
      env: { NODE_ENV: 'development', PORT: 3001 }
    },
    {
      name: 'agent',
      script: 'bun',
      args: 'dev',
      cwd: './pixel-agent',
      env: { NODE_ENV: 'development' }
    }
  ]
};
