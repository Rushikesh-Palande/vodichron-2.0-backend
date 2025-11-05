/**
 * WebSocket Connection Manager
 * ============================
 * Manages WebSocket server lifecycle and client connections
 * Handles connection acceptance/rejection based on authorization
 * Processes incoming messages and manages client cleanup on disconnect
 * 
 * Based on old vodichron socketServer with improved connection management
 */

import http from 'http';
import { Server as SocketServer } from 'ws';
import { ExtendedWebSocket } from './types/websocket.types';
import { validateAndProcessMessage } from './handlers/message-driver';
import { authorizeWebSocketConnection } from './middleware/socket-authorizer';
import { logger } from '../utils/logger';

/**
 * Track connected clients for monitoring
 */
const connectedClients = new Set<ExtendedWebSocket>();

/**
 * Initialize WebSocket Server
 * ===========================
 * Sets up WebSocket server with connection handling
 * 
 * @param server - HTTP/HTTPS server instance
 * @param wsPath - WebSocket path (default: /ws-con-ui-update)
 * @returns Configured WebSocket server instance
 */
export function initializeWebSocketServer(
  server: http.Server,
  wsPath: string = '/ws-con-ui-update'
): SocketServer {
  logger.info('🔌 Initializing WebSocket Server', {
    path: wsPath,
    maxClients: 'unlimited'
  });

  const wss = new SocketServer({ 
    server, 
    path: wsPath,
    // Performance settings
    perMessageDeflate: {
      clientNoContextTakeover: true,
      serverNoContextTakeover: true
    },
    maxPayload: 64 * 1024, // 64KB max message size
  });

  // Handle new client connections
  wss.on('connection', handleClientConnection);

  // Handle server errors
  wss.on('error', (error: Error) => {
    logger.error('❌ WebSocket server error', {
      error: error.message,
      stack: error.stack
    });
  });

  logger.info('✅ WebSocket Server initialized successfully', {
    path: wsPath
  });

  return wss;
}

/**
 * Handle Client Connection
 * ========================
 * Process new WebSocket client connections
 * Authorize client and set up event handlers
 * 
 * @param ws - WebSocket client instance
 * @param req - HTTP upgrade request
 */
function handleClientConnection(ws: ExtendedWebSocket, req: http.IncomingMessage): void {
  const clientIp = req.socket.remoteAddress || 'unknown';
  const clientPort = req.socket.remotePort || 'unknown';
  
  logger.debug('🔗 New WebSocket connection attempt', {
    clientIp,
    clientPort,
    url: req.url,
    headers: {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']
    }
  });

  // Authorize connection
  const authResult = authorizeWebSocketConnection(req);
  
  if (!authResult.authorized) {
    logger.warn('🚫 WebSocket connection rejected - Authorization failed', {
      clientIp,
      clientPort,
      reason: authResult.reason,
      url: req.url
    });

    ws.close(4001, 'Unauthorized - ' + authResult.reason);
    return;
  }

  // Accept connection
  logger.info('✅ WebSocket connection authorized', {
    clientIp,
    clientPort,
    userId: authResult.userId
  });

  // Initialize client metadata
  ws.isAlive = true;
  ws.userId = authResult.userId;
  ws.userRole = authResult.userRole;

  // Add to connected clients set
  connectedClients.add(ws);
  logger.info(`📊 Client connected (Total: ${connectedClients.size})`, {
    totalClients: connectedClients.size
  });

  // Send welcome message
  try {
    ws.send(JSON.stringify({
      status: 'success',
      message: 'WebSocket connection established',
      data: {
        userId: authResult.userId,
        userRole: authResult.userRole
      }
    }));
  } catch (error: any) {
    logger.error('❌ Failed to send welcome message', {
      error: error.message
    });
  }

  // Set up message handler
  ws.on('message', async (data: Buffer) => {
    logger.debug('📨 WebSocket message received', {
      userId: ws.userId,
      size: data.length
    });

    await validateAndProcessMessage(ws, data);
  });

  // Set up error handler
  ws.on('error', (error: Error) => {
    logger.error('❌ WebSocket client error', {
      userId: ws.userId,
      clientIp,
      error: error.message,
      code: (error as any).code
    });
  });

  // Set up close handler
  ws.on('close', (code: number, reason: string) => {
    handleClientDisconnect(ws, code, reason, clientIp);
  });

  // Set up pong handler for heartbeat
  ws.on('pong', () => {
    ws.isAlive = true;
    logger.debug('🏓 PONG received', {
      userId: ws.userId
    });
  });
}

/**
 * Handle Client Disconnect
 * ========================
 * Clean up client resources on disconnect
 * 
 * @param ws - WebSocket client instance
 * @param code - Close code
 * @param reason - Close reason
 * @param clientIp - Client IP address
 */
function handleClientDisconnect(
  ws: ExtendedWebSocket, 
  code: number, 
  reason: string,
  clientIp: string
): void {
  // Remove from connected clients
  connectedClients.delete(ws);

  logger.info('👋 WebSocket connection closed', {
    userId: ws.userId,
    clientIp,
    code,
    reason: reason || '(no reason)',
    totalRemainingClients: connectedClients.size
  });

  // Perform cleanup
  ws.isAlive = false;
  ws.removeAllListeners();
}

/**
 * Get Connected Clients Count
 * ===========================
 * Return number of currently connected clients
 * 
 * @returns Number of connected clients
 */
export function getConnectedClientsCount(): number {
  return connectedClients.size;
}

/**
 * Get Connected Clients Info
 * ==========================
 * Return information about all connected clients
 * 
 * @returns Array of client information
 */
export function getConnectedClientsInfo(): Array<{
  userId?: string;
  userRole?: any;
  isAlive?: boolean;
}> {
  return Array.from(connectedClients).map((client: ExtendedWebSocket) => ({
    userId: client.userId,
    userRole: client.userRole,
    isAlive: client.isAlive ?? true
  }));
}

/**
 * Broadcast Message to All Clients
 * ================================
 * Send message to all connected clients
 * 
 * @param message - Message to broadcast
 */
export function broadcastToAllClients(message: string | object): void {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  let successCount = 0;
  let failureCount = 0;

  connectedClients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(messageStr);
        successCount++;
      } catch (error: any) {
        logger.error('❌ Failed to broadcast to client', {
          userId: client.userId,
          error: error.message
        });
        failureCount++;
      }
    }
  });

  logger.debug(`📡 Message broadcasted`, {
    successCount,
    failureCount,
    totalClients: connectedClients.size
  });
}

/**
 * Send Message to Specific Client
 * ===============================
 * Send message to a specific user by userId
 * 
 * @param userId - Target user ID
 * @param message - Message to send
 * @returns true if message sent successfully
 */
export function sendMessageToClient(userId: string, message: string | object): boolean {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const client of Array.from(connectedClients) as ExtendedWebSocket[]) {
    if (client.userId === userId && client.readyState === 1) {
      try {
        client.send(messageStr);
        logger.debug('📤 Message sent to specific client', { userId });
        return true;
      } catch (error: any) {
        logger.error('❌ Failed to send message to client', {
          userId,
          error: error.message
        });
        return false;
      }
    }
  }

  logger.warn('⚠️ Target client not found or not connected', { userId });
  return false;
}

/**
 * Start Heartbeat Monitor
 * ======================
 * Periodically ping all connected clients to detect dead connections
 * 
 * @param intervalMs - Heartbeat interval in milliseconds (default: 30 seconds)
 */
export function startHeartbeatMonitor(intervalMs: number = 30000): NodeJS.Timer {
  logger.info('💓 Starting WebSocket heartbeat monitor', {
    intervalMs,
    intervalSeconds: intervalMs / 1000
  });

  return setInterval(() => {
    let pingSentCount = 0;
    let deadConnectionsCount = 0;

    connectedClients.forEach((client: ExtendedWebSocket) => {
      if (!client.isAlive) {
        logger.warn('❌ Terminating dead WebSocket connection', {
          userId: client.userId
        });
        deadConnectionsCount++;
        client.terminate();
        return;
      }

      client.isAlive = false;
      try {
        client.ping();
        pingSentCount++;
      } catch (error: any) {
        logger.error('❌ Failed to send ping', {
          userId: client.userId,
          error: error.message
        });
      }
    });

    if (pingSentCount > 0 || deadConnectionsCount > 0) {
      logger.debug('💓 Heartbeat check completed', {
        pingSentCount,
        deadConnectionsCount,
        activeClients: connectedClients.size
      });
    }
  }, intervalMs);
}
