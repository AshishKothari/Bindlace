/**
 * Shared Winston logger (console + `logs/` files); level from config.
 */
import winston from 'winston';
import path from 'path';
import { config } from '../config';

const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

export const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            ),
        }),
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
        }),
    ],
});
