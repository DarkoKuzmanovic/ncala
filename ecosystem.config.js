require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'ncala',
      script: 'server/index.js',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
        BASE_PATH: process.env.BASE_PATH || '/ncala'
      }
    }
  ]
};
