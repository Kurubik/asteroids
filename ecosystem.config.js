module.exports = {
  apps: [
    {
      name: 'asteroid-storm-server',
      script: 'dist/index.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        WS_PORT: 3011,
        HOST: '0.0.0.0',
        TICK_RATE: 60,
        MAX_PLAYERS_PER_ROOM: 8,
        MAX_ROOMS: 100,
        VITE_WS_URL: 'ws://134.209.227.100:3011',
        VITE_API_URL: 'http://134.209.227.100:3010',
      },
      
      // Development environment
      env_development: {
        NODE_ENV: 'development',
        PORT: 3010,
        WS_PORT: 3011,
        HOST: '0.0.0.0',
        TICK_RATE: 60,
        MAX_PLAYERS_PER_ROOM: 8,
        MAX_ROOMS: 100,
      },
      
      // Logging
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Health monitoring
      health_check_timeout: 30000,
      
      // Cluster settings (if needed)
      // instances: 'max',
      // exec_mode: 'cluster',
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: ['134.209.227.100'],
      ref: 'origin/main',
      repo: 'https://github.com/Kurubik/asteroids.git',
      path: '/var/www/asteroid-storm',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'git pull origin main'
    }
  }
};