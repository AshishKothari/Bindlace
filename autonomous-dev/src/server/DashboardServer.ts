/**
 * Local HTTP + WebSocket server for a simple dashboard and log streaming.
 */
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import winston from 'winston';

export class DashboardServer {
    private app: express.Application;
    private server: http.Server;
    private wss: WebSocketServer;

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupLogBroadcasting();
    }

    private setupMiddleware() {
        this.app.use(express.static(path.join(__dirname, '../web')));
        this.app.use(express.json());
    }

    private setupRoutes() {
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });
    }

    private setupWebSocket() {
        this.wss.on('connection', (ws) => {
            logger.info('Dashboard client connected');

            ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Autonomous AI Dev System' }));

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    // Handle control commands (pause/resume) here if needed
                    logger.info('Received command from dashboard', { data });
                } catch (e) {
                    logger.error('Invalid message from dashboard');
                }
            });
        });
    }

    private setupLogBroadcasting() {
        // Add a custom transport to winston to broadcast logs
        const transport = new winston.transports.Console({
            format: winston.format.json(),
        });

        // Monkey-patch the log method of the transport? No, better to add a new transport
        // But Logger is already created. We can add transport dynamically.
        logger.add(new winston.transports.Http({
            host: 'localhost', // Placeholder
            // Actually, standard HTTP transport sends to URL.
            // We want to send to our WebSocket.
        }));

        // Let's create a custom functional transport or just patch logger.
        // Easiest is to listen to the existing 'data' event on the File transport? No.
        // Let's create a custom stream adapter.

        // Working approach: Wrapper function
        const originalLog = logger.log.bind(logger);
        logger.log = (level: string | any, msg?: string, ...meta: any[]) => {
            // Call original
            // @ts-ignore
            originalLog(level, msg, ...meta);

            // Broadcast
            this.broadcast({
                type: 'log',
                data: { level, msg, meta, timestamp: new Date() }
            });
            return logger; // Chainable
        };
    }

    public broadcast(data: any) {
        const msg = JSON.stringify(data);
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    }

    public start() {
        this.server.listen(config.PORT, () => {
            logger.info(`Dashboard running at http://localhost:${config.PORT}`);
        });
    }
}
