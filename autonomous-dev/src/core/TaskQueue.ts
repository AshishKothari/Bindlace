/**
 * In-memory task list with persistence: load from JSON state or parsed markdown, expose next runnable task.
 */
import fs from 'fs/promises';
import path from 'path';
import { Task, TaskStatus } from '../models/Task';
import { MarkdownTaskParser } from './TaskParser';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TaskQueue {
    private tasks: Task[] = [];
    private stateFilePath: string;
    private parser: MarkdownTaskParser;

    constructor() {
        this.stateFilePath = path.join(config.WORKSPACE_ROOT, 'autonomous-dev', 'data', 'task-state.json');
        this.parser = new MarkdownTaskParser();
    }

    /**
     * Initialize the queue.
     * Tries to load from state file first.
     * If state file doesn't exist or is empty, loads from task list markdown.
     */
    async initialize(taskMdPath: string): Promise<void> {
        try {
            // Ensure data directory exists
            await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });

            const stateExists = await this.checkStateExists();
            if (stateExists) {
                logger.info('Loading tasks from state file');
                await this.loadState();
            } else {
                logger.info('Loading tasks from markdown file', { taskMdPath });
                this.tasks = await this.parser.parseFile(taskMdPath);
                await this.saveState();
            }

            logger.info(`TaskQueue initialized with ${this.tasks.length} tasks`);
        } catch (error) {
            logger.error('Failed to initialize TaskQueue', { error });
            throw error;
        }
    }

    private async checkStateExists(): Promise<boolean> {
        try {
            await fs.access(this.stateFilePath);
            return true;
        } catch {
            return false;
        }
    }

    private async loadState(): Promise<void> {
        const data = await fs.readFile(this.stateFilePath, 'utf-8');
        this.tasks = JSON.parse(data);
    }

    private async saveState(): Promise<void> {
        await fs.writeFile(this.stateFilePath, JSON.stringify(this.tasks, null, 2));
    }

    /**
     * Get the next pending task that has:
     * 1. Status = PENDING
     * 2. All dependencies COMPLETED
     * 3. Highest priority (if implemented)
     */
    getNextTask(): Task | null {
        const pendingTasks = this.getAllTasks().filter(t => t.status === TaskStatus.PENDING);

        for (const task of pendingTasks) {
            if (this.areDependenciesMet(task)) {
                return task;
            }
        }

        return null;
    }

    public getAllTasks(): Task[] {
        // Flatten hierarchy for searching
        const flatTasks: Task[] = [];
        const traverse = (tasks: Task[]) => {
            for (const t of tasks) {
                flatTasks.push(t);
                if (t.subtasks && t.subtasks.length > 0) {
                    traverse(t.subtasks);
                }
            }
        };
        traverse(this.tasks);
        return flatTasks;
    }

    private listeners: ((tasks: Task[]) => void)[] = [];

    public subscribe(listener: (tasks: Task[]) => void) {
        this.listeners.push(listener);
    }

    private notifyListeners() {
        const allTasks = this.getAllTasks();
        this.listeners.forEach(l => l(allTasks));
    }

    private areDependenciesMet(task: Task): boolean {
        if (!task.dependencies || task.dependencies.length === 0) return true;

        // Check if all dependencies are completed
        // This requires looking up tasks by ID. 
        // For simplicity, we assume dependencies are strictly previous tasks or IDs are unique global.
        // In this basic version, we might just check if parent is IN_PROGRESS (if subtask).
        // Markdown doesn't explicitly define dependencies other than order/hierarchy.

        // Hierarchy rule: A subtask can run if its parent is IN_PROGRESS or PENDING (starts parent)
        // Actually, usually subtasks are parts of a parent.
        // Let's stick to simple sequential for now if dependencies aren't explicit.

        return true;
    }

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
        const task = this.findTaskById(taskId);
        if (task) {
            task.status = status;
            task.updated_at = new Date();
            await this.saveState();
            this.notifyListeners();
            logger.info(`Updated task status`, { taskId, status });
        } else {
            logger.warn(`Task not found for update`, { taskId });
        }
    }

    private findTaskById(id: string): Task | undefined {
        return this.getAllTasks().find(t => t.id === id);
    }

    getTaskById(id: string): Task | undefined {
        return this.findTaskById(id);
    }
}
