const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;
const logsContainer = document.getElementById('logs');
const taskListContainer = document.getElementById('task-list');

let socket;

function connect() {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        addLog('System', 'Connected to server', 'success');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };

    socket.onclose = () => {
        addLog('System', 'Connection lost. Reconnecting...', 'error');
        setTimeout(connect, 3000);
    };
}

function handleMessage(msg) {
    if (msg.type === 'log') {
        // Correct formatting of log data
        const { level, message, timestamp } = msg.data;
        // Sometimes msg.data structure depends on logger wrapper
        // The wrapper sent { level, msg, meta, timestamp }
        const actualMsg = msg.data.msg || JSON.stringify(msg.data);
        addLog(String(msg.data.level).toUpperCase(), actualMsg, msg.data.level);
    } else if (msg.type === 'tasks_update') {
        updateTaskList(msg.data);
    }
}

function addLog(level, message, type) {
    const div = document.createElement('div');
    div.className = 'log-entry py-1 border-b border-slate-800/50 hover:bg-white/5 px-2';

    let colorClass = 'text-slate-300';
    if (String(type).includes('error')) colorClass = 'text-red-400';
    if (String(type).includes('warn')) colorClass = 'text-yellow-400';
    if (String(type).includes('info')) colorClass = 'text-blue-300';

    const time = new Date().toLocaleTimeString();

    div.innerHTML = `
        <span class="text-slate-500 mr-2">[${time}]</span>
        <span class="${colorClass} font-bold mr-2">${level}</span>
        <span class="text-slate-200">${message}</span>
    `;

    logsContainer.appendChild(div);

    // Auto scroll if near bottom
    if (logsContainer.scrollHeight - logsContainer.scrollTop < logsContainer.clientHeight + 100) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

function updateTaskList(tasks) {
    taskListContainer.innerHTML = '';

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `p-3 rounded flex gap-3 items-start mb-2 ${task.status === 'in-progress' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-800/40'
            }`;

        let icon = '○';
        if (task.status === 'completed') icon = '✓';
        if (task.status === 'in-progress') icon = '▶';
        if (task.status === 'failed') icon = '✗';

        let colorText = 'text-slate-400';
        if (task.status === 'completed') colorText = 'text-green-400';
        if (task.status === 'in-progress') colorText = 'text-blue-400';
        if (task.status === 'failed') colorText = 'text-red-400';

        div.innerHTML = `
            <span class="${colorText} mt-0.5 font-bold">${icon}</span>
            <div class="flex-1">
                <div class="text-sm font-medium ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}">
                    ${task.description}
                </div>
                <div class="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>${task.id}</span>
                    <span class="uppercase">${task.status}</span>
                </div>
            </div>
        `;

        taskListContainer.appendChild(div);

        if (task.status === 'in-progress') {
            document.getElementById('current-task').textContent = task.description;
        }
    });
}

// Start
connect();
