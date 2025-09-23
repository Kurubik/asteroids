# Asteroid Storm Online

A modern multiplayer remake of the classic Asteroids game built with Three.js, WebSockets, and TypeScript. Features real-time multiplayer gameplay with server-authoritative simulation and client-side prediction.

![Asteroid Storm Online](https://img.shields.io/badge/Game-Asteroid%20Storm%20Online-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Three.js](https://img.shields.io/badge/Three.js-3D%20Graphics-orange)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)

## 🎮 Features

- **Real-time Multiplayer**: Up to 8 players per room with WebSocket communication
- **Server-Authoritative**: Prevents cheating with server-side physics simulation
- **Client-Side Prediction**: Smooth gameplay with lag compensation
- **Retro Vector Graphics**: Classic Asteroids visual style using Three.js
- **Spatial Audio**: Procedurally generated sound effects
- **Room System**: Join by room code or quick-play matchmaking
- **Responsive Controls**: WASD/Arrow keys + Space to shoot
- **Mobile Ready**: Responsive design for various screen sizes

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)

```bash
npm install -g pnpm
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd asteroids
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   ```

4. **Start development servers**:
   ```bash
   pnpm dev
   ```

This starts both the client (http://localhost:5173) and server (ws://localhost:3011).

### Production Build

```bash
# Build all packages
pnpm build

# Start production server (simple)
pnpm start

# Or deploy with PM2 (recommended)
pnpm deploy
```

## 🎯 How to Play

### Controls

- **Movement**: `WASD` or Arrow Keys
  - `W` / `↑`: Thrust forward
  - `A` / `←`: Rotate left
  - `D` / `→`: Rotate right
  - `S` / `↓`: Brake/Reverse thrust
- **Combat**: `Space` to shoot
- **Menu**: `ESC` to leave game

### Gameplay

1. **Join a Game**:
   - Enter your player name
   - Join with room code or use Quick Play
   - Wait for other players (optional)

2. **Survive and Score**:
   - Shoot asteroids to break them apart
   - Large → Medium → Small → Destroyed
   - Avoid collisions with asteroids
   - Compete for the highest score

3. **Respawn**: 
   - You have 3 lives
   - Respawn with temporary invulnerability
   - Game continues until all lives lost

## 🏗️ Architecture

### Project Structure

```
asteroid-storm-online/
├── client/          # Frontend (Vite + Three.js)
│   ├── src/
│   │   ├── game/    # Game loop, input, prediction
│   │   ├── render/  # Three.js rendering
│   │   ├── net/     # WebSocket client
│   │   ├── ui/      # User interface
│   │   └── audio/   # Web Audio API
│   └── public/      # Static assets
├── server/          # Backend (Node.js + WebSockets)
│   ├── src/
│   │   ├── room/    # Room management
│   │   ├── net/     # WebSocket server
│   │   └── utils/   # Logging, helpers
│   └── public/      # Served client build
└── shared/          # Common code and types
    └── src/
        ├── simulation/  # Game physics
        ├── types.ts     # TypeScript interfaces
        ├── constants.ts # Game configuration
        ├── math.ts      # Vector math utilities
        └── utils.ts     # Shared utilities
```

### Technology Stack

#### Client
- **Vite**: Fast development and building
- **Three.js**: 3D graphics and rendering
- **TypeScript**: Type-safe development
- **Web Audio API**: Procedural sound generation

#### Server
- **Node.js**: Runtime environment
- **WebSocket**: Real-time communication
- **Express**: HTTP server for static files
- **TypeScript**: Shared codebase language

#### Shared
- **Physics Simulation**: Deterministic game logic
- **Spatial Hashing**: Efficient collision detection
- **Math Utilities**: Vector operations and helpers

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001                    # HTTP server port
WS_PORT=3002                # WebSocket server port
TICK_RATE=60                # Server simulation rate
MAX_PLAYERS_PER_ROOM=8      # Room player limit
MAX_ROOMS=100               # Maximum concurrent rooms

# Client Configuration
VITE_WS_URL=ws://localhost:3002    # WebSocket server URL
VITE_API_URL=http://localhost:3001 # API server URL

# Development
NODE_ENV=development        # Environment mode
```

### Game Configuration

Edit `shared/src/constants.ts` to modify:

- **World Size**: Play area dimensions
- **Player Stats**: Speed, health, lives
- **Weapon Settings**: Fire rate, bullet speed
- **Asteroid Properties**: Sizes, spawn rates
- **Network Settings**: Tick rates, buffer sizes

## 🎨 Customization

### Visual Style

The game uses a retro vector graphics style. Customize colors in `shared/src/constants.ts`:

```typescript
export const RENDER_CONFIG = {
  COLORS: {
    PLAYER: 0x00ff00,    // Green ships
    ASTEROID: 0xffffff,  // White asteroids
    BULLET: 0xffff00,    // Yellow bullets
    THRUST: 0xff6600,    // Orange thrust
    EXPLOSION: 0xff0000, // Red explosions
    UI: 0x00ffff,        // Cyan UI
    BACKGROUND: 0x000000 // Black space
  }
};
```

### Audio

Sound effects are procedurally generated. Modify `client/src/audio/AudioManager.ts` to:

- Adjust sound generation parameters
- Add new sound types
- Change audio mixing levels

## 🚀 Deployment

### Development

```bash
# Start all services in development mode
pnpm dev

# Or start individually:
pnpm --filter server dev    # Start server only
pnpm --filter client dev    # Start client only
```

### Production Deployment

#### Quick Production Setup

1. **On your server**, clone and setup:
   ```bash
   git clone https://github.com/Kurubik/asteroids.git
   cd asteroids
   pnpm production-setup
   ```

2. **Edit environment** for your server:
   ```bash
   # Edit .env file - replace localhost with your server IP
   nano .env
   ```

3. **Deploy with PM2**:
   ```bash
   pnpm deploy
   ```

#### Manual Production Setup

1. **Build the project**:
   ```bash
   pnpm build
   ```

2. **Start with PM2** (recommended):
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start with PM2
   pnpm pm2:start
   
   # Monitor
   pnpm pm2:monit
   ```

3. **Or start simple** (not recommended for production):
   ```bash
   pnpm start
   ```

#### PM2 Commands

```bash
pnpm pm2:start     # Start server with PM2
pnpm pm2:stop      # Stop server
pnpm pm2:restart   # Restart server
pnpm pm2:logs      # View logs
pnpm pm2:monit     # Monitor performance
```

#### Environment Configuration

The server now runs on ports **3010-3011** by default and binds to **0.0.0.0** for remote access.

**For production**, update your `.env` file:
```bash
# Server Configuration
PORT=3010
WS_PORT=3011
HOST=0.0.0.0

# Client URLs (replace with your server IP/domain)
VITE_WS_URL=ws://your-server-ip:3011
VITE_API_URL=http://your-server-ip:3010
```

#### Nginx Reverse Proxy (Optional)

For production with SSL, use the provided `nginx.conf.example`:

1. **Copy nginx config**:
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/asteroid-storm
   sudo ln -s /etc/nginx/sites-available/asteroid-storm /etc/nginx/sites-enabled/
   ```

2. **Update the config** with your domain and SSL certificates

3. **Restart nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

#### Firewall Setup

Open the required ports:
```bash
# For direct access
sudo ufw allow 3010
sudo ufw allow 3011

# For nginx proxy (if using)
sudo ufw allow 80
sudo ufw allow 443
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json pnpm-*.yaml ./
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3001 3002
CMD ["pnpm", "start"]
```

## 🧪 Testing

```bash
# Run shared package tests
pnpm --filter shared test

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## 🔍 Debugging

### Client Debug Tools

Open browser console and access:

```javascript
// Game instance
window.game

// Debug information
window.game.getDebugInfo()

// Current game state
window.game.getCurrentState()
```

### Server Monitoring

The server provides debug endpoints:

- `GET /api/stats` - Server statistics
- `GET /api/rooms` - Active rooms list
- `GET /health` - Health check

## 📈 Performance

### Client Optimization

- **Rendering**: Uses instanced meshes for bullets
- **Memory**: Object pooling for particles
- **Network**: Delta compression for snapshots
- **Input**: Client-side prediction reduces perceived lag

### Server Optimization

- **Physics**: Spatial hashing for collision detection
- **Network**: Configurable tick and snapshot rates
- **Memory**: Circular buffers for input history
- **Scaling**: Room-based architecture for horizontal scaling

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**:
   - Check WebSocket URL in `.env`
   - Ensure server is running on correct port
   - Verify firewall settings

2. **Build Errors**:
   - Run `pnpm install` to update dependencies
   - Check TypeScript version compatibility
   - Clear `node_modules` and reinstall if needed

3. **Performance Issues**:
   - Reduce `TICK_RATE` in server config
   - Lower particle counts in render config
   - Check browser hardware acceleration

### Getting Help

- Check the browser console for client errors
- Review server logs for connection issues  
- Use debug endpoints for server monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages
5. Push and create a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Run `pnpm format` before committing
- Add JSDoc comments for public APIs

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Classic Asteroids arcade game by Atari
- Three.js community for excellent documentation
- WebRTC/WebSocket standards for real-time communication
- Open source contributors and testers

---

**Happy Gaming! 🚀**

For questions or support, please open an issue on GitHub.