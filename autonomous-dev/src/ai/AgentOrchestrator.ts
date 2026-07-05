/**
 * Runs one task: prompt → JSON actions (read/write/exec) → filesystem + shell, with safety checks.
 */
import { AIProvider } from './AIProvider';
import { PromptFactory } from './PromptFactory';
import { Task, TaskStatus } from '../models/Task';
import { TaskQueue } from '../core/TaskQueue';
import { logger } from '../utils/logger';
import { SafetyGuard } from '../safety/SafetyGuard';
import fs from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { config } from '../config';

const execAsync = util.promisify(exec);

interface AgentAction {
    type: 'read_file' | 'write_file' | 'run_command' | 'list_dir' | 'task_complete';
    path?: string;
    content?: string;
    command?: string;
    result?: string;
}

interface AgentResponse {
    thought: string;
    actions: AgentAction[];
}

export class AgentOrchestrator {
    private aiProvider: AIProvider;
    private promptFactory: PromptFactory;
    private taskQueue: TaskQueue;

    constructor(aiProvider: AIProvider, taskQueue: TaskQueue) {
        this.aiProvider = aiProvider;
        this.promptFactory = new PromptFactory();
        this.taskQueue = taskQueue;
    }

    async executeTask(task: Task): Promise<void> {
        logger.info(`Starting execution for task: ${task.id}`);

        // Update status
        await this.taskQueue.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);

        // Initial Context
        let context = await this.getProjectContext();
        let loops = 0;
        const MAX_LOOPS = 10;

        try {
            while (loops < MAX_LOOPS) {
                await SafetyGuard.checkApiLimits();

                const prompt = this.promptFactory.createTaskPrompt(task, context);
                const response = await this.aiProvider.generateText(prompt, {
                    temperature: 0.2, // Low temp for deterministic actions
                    responseFormat: 'json_object'
                });

                const agentResponse = this.parseResponse(response.text);
                logger.info('Agent thought', { thought: agentResponse.thought });

                // Execute Actions
                let taskCompleted = false;
                for (const action of agentResponse.actions) {
                    const result = await this.performAction(action);
                    context += `\n\nAction: ${JSON.stringify(action)}\nResult: ${result}`;

                    if (action.type === 'task_complete') {
                        taskCompleted = true;
                    }
                }

                if (taskCompleted) {
                    await this.taskQueue.updateTaskStatus(task.id, TaskStatus.COMPLETED);
                    logger.info(`Task completed: ${task.id}`);
                    return;
                }

                loops++;
            }

            logger.warn(`Task timed out after ${MAX_LOOPS} loops`);
            await this.taskQueue.updateTaskStatus(task.id, TaskStatus.FAILED);

        } catch (error) {
            logger.error(`Task execution failed`, { error });
            await this.taskQueue.updateTaskStatus(task.id, TaskStatus.FAILED);
        }
    }

    private async getProjectContext(): Promise<string> {
        try {
            const files = await fs.readdir(config.WORKSPACE_ROOT);
            return `Root Directory Files: ${files.join(', ')}`;
        } catch (err) {
            return 'Could not read root directory.';
        }
    }

    private parseResponse(text: string): AgentResponse {
        try {
            // Clean markdown code blocks if present
            const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonText);
        } catch (e) {
            logger.error('Failed to parse AI response', { text });
            throw new Error('Invalid JSON response from AI');
        }
    }

    private async performAction(action: AgentAction): Promise<string> {
        try {
            switch (action.type) {
                case 'read_file':
                    if (!action.path) return 'Error: Missing path';
                    const readPath = SafetyGuard.validatePath(action.path);
                    const content = await fs.readFile(readPath, 'utf-8');
                    return `File Content (${action.path}):\n${content}`;

                case 'write_file':
                    if (!action.path || !action.content) return 'Error: Missing path or content';
                    const writePath = SafetyGuard.validatePath(action.path);
                    await fs.writeFile(writePath, action.content);
                    return `Successfully wrote to ${action.path}`;

                case 'run_command':
                    if (!action.command) return 'Error: Missing command';
                    // Note: Executing commands is dangerous. 
                    // Ideally we should have a whitelist or specialized runner.
                    // For now, running in CWD.
                    const { stdout, stderr } = await execAsync(action.command, { cwd: config.WORKSPACE_ROOT });
                    return `Command Output:\n${stdout}\nstderr:\n${stderr}`;

                case 'list_dir':
                    if (!action.path) return 'Error: Missing path';
                    const listPath = SafetyGuard.validatePath(action.path);
                    const files = await fs.readdir(listPath);
                    return `Files in ${action.path}: ${files.join(', ')}`;

                case 'task_complete':
                    return 'Task marked as complete.';

                default:
                    return `Unknown action type: ${(action as any).type}`;
            }
        } catch (error: any) {
            return `Action failed: ${error.message}`;
        }
    }
}
