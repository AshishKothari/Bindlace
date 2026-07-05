/**
 * Parses `task.md`-style markdown into `Task` records (IDs, dependencies, checkboxes).
 */
import fs from 'fs/promises';
import crypto from 'crypto';
import { Task, TaskStatus } from '../models/Task';
import { logger } from '../utils/logger';

export class MarkdownTaskParser {
    /**
     * Parses a markdown file and returns a list of tasks
     */
    async parseFile(filePath: string): Promise<Task[]> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return this.parseContent(content);
        } catch (error) {
            logger.error('Failed to parse task file', { filePath, error });
            throw error;
        }
    }

    /**
     * Parses raw markdown content into Task objects
     */
    parseContent(content: string): Task[] {
        const lines = content.split(/\r?\n/);
        const tasks: Task[] = [];
        const stack: { task: Task; indent: number }[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(\s*)- \[([ xX/])\] (.*)$/);

            if (match) {
                const indent = match[1].length;
                const statusChar = match[2];
                const description = match[3].trim();

                let status = TaskStatus.PENDING;
                if (statusChar === 'x' || statusChar === 'X') status = TaskStatus.COMPLETED;
                if (statusChar === '/') status = TaskStatus.IN_PROGRESS;

                // Extract ID if present (<!-- id: 123 -->)
                const idMatch = description.match(/<!-- id: (.*?) -->/);
                const id = idMatch ? idMatch[1] : crypto.randomUUID();
                const cleanDescription = description.replace(/<!-- id: .*? -->/, '').trim();

                const newTask: Task = {
                    id,
                    description: cleanDescription,
                    status,
                    priority: 0, // Default priority
                    dependencies: [],
                    subtasks: [],
                    created_at: new Date(),
                    updated_at: new Date(),
                };

                // Manage hierarchy based on indentation
                while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                    stack.pop();
                }

                if (stack.length > 0) {
                    // Add as subtask to parent
                    const parent = stack[stack.length - 1].task;
                    parent.subtasks.push(newTask);
                } else {
                    // Top-level task
                    tasks.push(newTask);
                }

                stack.push({ task: newTask, indent });
            }
        }

        return tasks;
    }
}
