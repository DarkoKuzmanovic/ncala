module.exports = {
  apps: [
    {
      name: 'ncala',
      script: 'server/index.js',
      instances: 1,
      watch: false,
      env: {
        PORT: process.env.PORT || 3000,
        BASE_PATH: process.env.BASE_PATH || ''
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        BASE_PATH: process.env.BASE_PATH || '/ncala'
      }
    }
  ]
};
