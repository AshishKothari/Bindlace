/**
 * Wires task queue, AI orchestrator, and dashboard; polls for tasks and runs `executeTask` in a loop.
 */
import { TaskQueue } from './core/TaskQueue';
import { AgentOrchestrator } from './ai/AgentOrchestrator';
import { GeminiAdapter } from './ai/GeminiAdapter';
import { DashboardServer } from './server/DashboardServer';
import { logger } from './utils/logger';
import path from 'path';
import { config } from './config';

export class AutomationEngine {
    private taskQueue: TaskQueue;
    private orchestrator: AgentOrchestrator;
    private dashboard: DashboardServer;
    private isRunning: boolean = false;

    constructor() {
        this.taskQueue = new TaskQueue();
        // Use Gemini by default as per config
        // In future, use factory based on config.AI_PROVIDER
        const aiProvider = new GeminiAdapter();
        this.orchestrator = new AgentOrchestrator(aiProvider, this.taskQueue);
        this.dashboard = new DashboardServer();
    }

    async start() {
        try {
            logger.info('Starting Autonomous AI Automation Engine...');

            // Start Dashboard
            this.dashboard.start();

            // Initialize Task Queue
            // Assuming tasks.md is in the project root or passed as arg
            // For now, let's look for ../tasks.md or ../task.md
            const taskMdPath = path.resolve(config.WORKSPACE_ROOT, 'task.md');
            await this.taskQueue.initialize(taskMdPath);

            // Wire up updates
            this.taskQueue.subscribe((tasks) => {
                this.dashboard.broadcast({
                    type: 'tasks_update',
                    data: tasks
                });
            });

            // Send initial state
            this.dashboard.broadcast({
                type: 'tasks_update',
                data: this.taskQueue.getAllTasks()
            });

            this.isRunning = true;
            this.loop();

        } catch (error) {
            logger.error('Fatal error starting engine', { error });
            process.exit(1);
        }
    }

    private async loop() {
        while (this.isRunning) {
            const task = this.taskQueue.getNextTask();

            if (task) {
                try {
                    logger.info(`Processing task: ${task.description}`);
                    await this.orchestrator.executeTask(task);
                } catch (error) {
                    logger.error(`Error executing task`, { error });
                }
            } else {
                // No tasks ready. Wait a bit.
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    stop() {
        this.isRunning = false;
        logger.info('Stopping engine...');
    }
}
