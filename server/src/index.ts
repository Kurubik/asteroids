import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { ServerConfig } from './types.js';
import { WebSocketServer } from './net/WebSocketServer.js';
import { Logger } from './utils/Logger.js';

// Load environment variables
config();

const logger = new Logger('Server');

// Server configuration
const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3010'),
  wsPort: parseInt(process.env.WS_PORT || '3011'),
  host: process.env.HOST || '0.0.0.0',
  tickRate: parseInt(process.env.TICK_RATE || '60'),
  maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM || '8'),
  maxRooms: parseInt(process.env.MAX_ROOMS || '100'),
};

// Create Express app
const app: express.Express = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with actual domain
    : true, // Allow all origins in development
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Create WebSocket server
const wsServer = new WebSocketServer(serverConfig);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const stats = wsServer.getStats();
  res.json({
    ...stats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Room list endpoint
app.get('/api/rooms', (req, res) => {
  const rooms = wsServer.getRoomList();
  res.json(rooms);
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start HTTP server
const httpServer = app.listen(serverConfig.port, serverConfig.host, () => {
  logger.info(`HTTP server listening on ${serverConfig.host}:${serverConfig.port}`);
  logger.info(`WebSocket server listening on ${serverConfig.host}:${serverConfig.wsPort}`);
  logger.info(`Game tick rate: ${serverConfig.tickRate} Hz`);
  logger.info(`Max players per room: ${serverConfig.maxPlayersPerRoom}`);
  logger.info(`Max rooms: ${serverConfig.maxRooms}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Received shutdown signal, gracefully shutting down...');

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown WebSocket server
  await wsServer.shutdown();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { app, wsServer, serverConfig };