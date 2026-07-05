/**
 * Workspace path confinement and coarse API usage limits before executing agent actions.
 */
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SafetyGuard {
    private static dailyApiCallCount = 0;
    private static MAX_DAILY_CALLS = 100; // Hard limit for safety

    /**
     * Validates that a path is within the allowed workspace
     */
    static validatePath(targetPath: string): string {
        const resolvedPath = path.resolve(config.WORKSPACE_ROOT, targetPath);
        const workspaceRoot = path.resolve(config.WORKSPACE_ROOT);

        if (!resolvedPath.startsWith(workspaceRoot)) {
            logger.error('Security violation: Attempted path escape', { targetPath, resolvedPath });
            throw new Error(`Access Denied: Path ${targetPath} is outside workspace root.`);
        }

        return resolvedPath;
    }

    /**
     * Checks if we are within API limits
     */
    static async checkApiLimits(): Promise<void> {
        if (this.dailyApiCallCount >= this.MAX_DAILY_CALLS) {
            logger.error('Daily API limit reached');
            throw new Error('Safety Stop: Daily API limit reached.');
        }
        this.dailyApiCallCount++;
    }
}
