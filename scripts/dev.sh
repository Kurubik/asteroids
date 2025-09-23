#!/bin/bash

# Asteroid Storm Online Development Script
echo "🚀 Starting Asteroid Storm Online in development mode..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed."
    echo "   Install it with: npm install -g pnpm"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️ Creating .env file from template..."
    cp .env.example .env
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🎮 Starting development servers..."
echo "   - Client: http://localhost:5173"
echo "   - Server: ws://localhost:3002"
echo "   - API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Start development with concurrently
pnpm dev