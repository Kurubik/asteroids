#!/bin/bash

# Production setup script for remote servers
echo "🌐 Setting up Asteroid Storm Online for production..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please don't run as root. Use a regular user with sudo access."
    exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create production environment file
echo "⚙️ Setting up production environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Please edit .env file with your server's IP address:"
    echo "   - Replace localhost with your server's public IP"
    echo "   - Update VITE_WS_URL and VITE_API_URL"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the project
echo "🔨 Building project..."
pnpm build

# Setup PM2 startup
echo "🔄 Setting up PM2 startup..."
pm2 startup

echo "✅ Production setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your server IP"
echo "2. Run: ./scripts/deploy.sh"
echo "3. Configure firewall for ports 3010-3011"
echo "4. Setup nginx reverse proxy (optional)"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 stop asteroid-storm-server"
echo "   pm2 restart asteroid-storm-server"
echo "   pm2 logs asteroid-storm-server"
echo "   pm2 monit"