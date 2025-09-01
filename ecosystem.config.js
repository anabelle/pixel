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
    }
  ]
};
