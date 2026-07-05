/**
 * Process entry: start the autonomous engine, graceful shutdown on SIGINT/SIGTERM.
 * Experimental app; not part of the Bindlace `wflow` packages.
 */
import { AutomationEngine } from './AutomationEngine';
import { logger } from './utils/logger';

const engine = new AutomationEngine();

engine.start().catch(error => {
    logger.error('Unhandled error in engine', { error });
    process.exit(1);
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    engine.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    engine.stop();
    process.exit(0);
});
