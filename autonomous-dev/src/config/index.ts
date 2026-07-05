/**
 * Environment-backed settings: API keys, workspace root, port, log level (loaded from `.env` near package root).
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
    PORT: number;
    AI_PROVIDER: 'gemini' | 'openai' | 'anthropic';
    AI_API_KEY: string;
    MAX_DAILY_COST: number;
    WORKSPACE_ROOT: string;
    LOG_LEVEL: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const config: Config = {
    PORT: parseInt(getEnv('PORT', '3000'), 10),
    AI_PROVIDER: getEnv('AI_PROVIDER', 'gemini') as Config['AI_PROVIDER'],
    AI_API_KEY: getEnv('AI_API_KEY'),
    MAX_DAILY_COST: parseFloat(getEnv('MAX_DAILY_COST', '5.0')),
    WORKSPACE_ROOT: path.resolve(getEnv('WORKSPACE_ROOT', process.cwd())),
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
};
