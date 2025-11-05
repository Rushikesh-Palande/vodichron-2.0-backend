/**
 * PM2 Configuration
 * ================
 * Production process management and clustering configuration
 * Usage: pm2 start pm2.config.js
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'vodichron-backend',
      
      // Main script
      script: './dist/server.js',
      
      // Clustering
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
      },
      
      // Memory management
      max_memory_restart: '1G',
      
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // File watching
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist'],
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      
      // Daily restart at 2 AM
      cron_restart: '0 2 * * *',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
    },
  ],

  // Cluster mode settings
  deploy: {
    production: {
      user: 'vodichron',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/vodichron-2.0-backend.git',
      path: '/var/www/vodichron-backend',
      'post-deploy': 'npm ci --production && npm run build:clean && pm2 restart vodichron-backend',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
  },
};
