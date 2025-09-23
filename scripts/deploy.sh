#!/bin/bash

# Asteroid Storm Online Deployment Script
echo "🚀 Deploying Asteroid Storm Online..."

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is required but not installed."
    echo "   Install it with: npm install -g pm2"
    exit 1
fi

# Build the project
echo "📦 Building project..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Create logs directory
mkdir -p server/logs

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop asteroid-storm-server 2>/dev/null || true
pm2 delete asteroid-storm-server 2>/dev/null || true

# Start with PM2
echo "🎮 Starting Asteroid Storm Online with PM2..."
pm2 start ecosystem.config.js --env production

# Show status
pm2 status

echo "✅ Deployment complete!"
echo "   - Game server: http://0.0.0.0:3010"
echo "   - WebSocket: ws://0.0.0.0:3011"
echo "   - PM2 process: asteroid-storm-server"
echo ""
echo "📊 Monitor with: pm2 monit"
echo "📜 View logs with: pm2 logs asteroid-storm-server"