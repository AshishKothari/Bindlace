/**
 * Builds system/user prompts that require the model to return a fixed JSON action schema.
 */
import { Task } from '../models/Task';

export class PromptFactory {
    createTaskPrompt(task: Task, projectContext: string): string {
        return `
You are an autonomous AI software engineer.
Your goal is to complete the following task:

**TASK**: ${task.description}
**TASK ID**: ${task.id}

## Project Context
${projectContext}

## Constraints
1. You must output a VALID JSON object.
2. Do not output markdown blocks around the JSON.
3. Your response must follow this schema:
{
  "thought": "Reasoning about what to do next",
  "actions": [
    {
      "type": "read_file",
      "path": "path/to/file"
    },
    {
      "type": "write_file",
      "path": "path/to/file",
      "content": "file content here"
    },
    {
      "type": "run_command",
      "command": "npm install pkg"
    },
    {
      "type": "task_complete",
      "result": "Description of what was done"
    }
  ]
}

## Allowed Actions
- read_file(path)
- write_file(path, content)
- run_command(command)
- list_dir(path)
- task_complete(result)

Think step-by-step. If you need to explore the codebase, use list_dir or read_file first.
`;
    }
}
