/**
 * Task shape for the autonomous-dev queue (status, deps, nested subtasks).
 */
export enum TaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
}

export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    priority: number;
    dependencies: string[];
    subtasks: Task[];
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}
