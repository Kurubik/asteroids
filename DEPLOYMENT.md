# 🚀 Asteroid Storm Online - Production Deployment Guide

## 🎯 Quick Deployment

### For VPS/Cloud Servers

1. **Clone on your server**:
   ```bash
   git clone https://github.com/Kurubik/asteroids.git
   cd asteroids
   ```

2. **Run production setup**:
   ```bash
   chmod +x scripts/*.sh
   ./scripts/production.sh
   ```

3. **Configure environment**:
   ```bash
   # For the specific production server (134.209.227.100):
   cp .env.production .env
   
   # Or manually edit .env with your server's IP:
   nano .env
   
   # Update these lines:
   VITE_WS_URL=ws://134.209.227.100:3011
   VITE_API_URL=http://134.209.227.100:3010
   ```

4. **Deploy with PM2**:
   ```bash
   ./scripts/deploy.sh
   ```

5. **Configure firewall**:
   ```bash
   sudo ufw allow 3010
   sudo ufw allow 3011
   ```

Your game is now running at `http://134.209.227.100:3010`!

## 🎮 Live Demo

**Try the game now**: http://134.209.227.100:3010

The production server is already running and ready for multiplayer games!

## 📋 What Changed

### ✅ Port Configuration
- **HTTP Server**: `3010` (was 3001)
- **WebSocket Server**: `3011` (was 3002)
- **Host Binding**: `0.0.0.0` (allows remote connections)

### ✅ PM2 Process Management
- **Process Name**: `asteroid-storm-server`
- **Auto-restart**: On crashes and server reboot
- **Logging**: Centralized in `server/logs/`
- **Memory Management**: Auto-restart at 500MB

### ✅ Production Scripts
- `pnpm deploy` - Full deployment automation
- `pnpm production-setup` - Server environment setup
- `pnpm pm2:start|stop|restart|logs|monit` - PM2 management

### ✅ Nginx Support (Optional)
- SSL termination
- WebSocket proxy
- Static file serving
- Security headers

## 🔧 PM2 Commands

```bash
# Start server
pnpm pm2:start

# Monitor real-time
pnpm pm2:monit

# View logs
pnpm pm2:logs

# Restart server
pnpm pm2:restart

# Stop server
pnpm pm2:stop
```

## 🌐 Production URLs

After deployment, your game will be accessible at:

- **Game Client**: `http://YOUR_SERVER_IP:3010`
- **WebSocket**: `ws://YOUR_SERVER_IP:3011`
- **Health Check**: `http://YOUR_SERVER_IP:3010/health`
- **Server Stats**: `http://YOUR_SERVER_IP:3010/api/stats`

## 🔒 Security Considerations

1. **Firewall**: Only open necessary ports (3010, 3011)
2. **SSL**: Use nginx reverse proxy for HTTPS
3. **Updates**: Keep Node.js and dependencies updated
4. **Monitoring**: Use PM2 monitoring and alerts
5. **Backups**: Regular server backups

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs asteroid-storm-server --lines 50

# Check if ports are in use
lsof -i :3010
lsof -i :3011
```

### Can't Connect from Client
```bash
# Check server is listening on all interfaces
netstat -tlnp | grep :3010

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://YOUR_SERVER_IP:3011
```

### High Memory Usage
```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart asteroid-storm-server

# Check logs for memory leaks
pm2 logs asteroid-storm-server | grep -i memory
```

## 📊 Performance Tips

1. **Use nginx** reverse proxy for better performance
2. **Enable gzip** compression (included in nginx config)
3. **Monitor** with PM2 and set up alerts
4. **Scale horizontally** by running multiple game instances
5. **Use a CDN** for static assets if needed

## 🚀 Advanced Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t asteroid-storm .

# Run container
docker run -d -p 3010:3010 -p 3011:3011 asteroid-storm
```

### Load Balancer Setup
For high traffic, use nginx or HAProxy to load balance multiple game instances across different ports.

---

**Your multiplayer Asteroids game is now production-ready!** 🎮✨