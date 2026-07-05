# Autonomous AI Developer System

A 24/7 autonomous AI agent that executes tasks from a markdown list, writes code, and reports progress via a real-time dashboard.

## 🚀 Features

*   **Autonomous Execution**: Reads `task.md`, plans, and implements features without human intervention.
*   **Real-time Dashboard**: Live web interface to monitor tasks, logs, and API usage.
*   **Safety Guards**: Built-in path validation sandbox and API cost limiters.
*   **Resilient**: Persists state to disk and recovers from crashes.
*   **Extensible**: Modular architecture with support for multiple AI providers (Gemini, OpenAI).

## 🛠️ Setup

1.  **Install Dependencies**
    ```bash
    cd autonomous-dev
    npm install
    ```

2.  **Configuration**
    Copy `.env.example` to `.env` and configure your API key:
    ```bash
    cp .env.example .env
    ```
    Edit `.env`:
    ```ini
    AI_API_KEY=your_google_gemini_key
    MAX_DAILY_COST=5.0
    ```

3.  **Build**
    ```bash
    npm run build
    ```

## 🏃‍♂️ Usage

1.  **Create a Task List**
    Create a file named `task.md` in your project root with the tasks you want the AI to perform:
    ```markdown
    - [ ] Create a hello world script
    - [ ] Add a unit test
    ```

2.  **Start the Engine**
    ```bash
    npm start
    ```

3.  **Monitor Progress**
    Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🛡️ Safety

*   **File Sandbox**: The agent can only read/write files within the `WORKSPACE_ROOT` (default: project root).
*   **API Limits**: Hard limit of 100 API calls per session (configurable in `SafetyGuard.ts`).
*   **Review Mode**: By default, the agent runs autonomously. Use `pause` in the dashboard (coming soon) to intervene.

## 🏗️ Architecture

*   **Engine**: `AutomationEngine` orchestrates the loop.
*   **Brain**: `AgentOrchestrator` uses LLMs to generate actions.
*   **Memory**: `TaskQueue` manages state (persisted to `data/task-state.json`).
*   **Eyes**: `DashboardServer` broadcasts events via WebSocket.
