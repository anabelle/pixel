module.exports = {
  apps: [
    {
      name: 'lnpixels-api',
      script: 'npm',
      args: 'run dev',
      cwd: './lnpixels/api',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'lnpixels-web',
      script: 'npm',
      args: 'run dev',
      cwd: './lnpixels/web',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      }
    },
    {
      name: 'pixel-agent',
      script: 'bun',
      args: 'run start',
      cwd: './pixel-agent',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'pixel-landing',
      script: 'npm',
      args: 'run start',
      cwd: './pixel-landing',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'server-monitor',
      script: 'server-monitor.js',
      cwd: './',
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
};
