module.exports = {
  apps: [
    {
      name: 'lnpixels-api',
      script: 'npm',
      args: 'run start',
      cwd: './lnpixels/api',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'lnpixels-app',
      script: 'bun',
      args: 'run start',
      cwd: './lnpixels/lnpixels-app',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    },
    {
      name: 'pixel-agent',
      script: 'bun',
      args: 'run start',
      cwd: './pixel-agent',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--require ./twitter-patch.js'
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
    }
  ]
};
