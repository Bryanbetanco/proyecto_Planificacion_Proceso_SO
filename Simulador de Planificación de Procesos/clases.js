document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let processes = [];
    const algorithmSelect = document.getElementById('algorithm-select');
    const quantumContainer = document.getElementById('quantum-container');
    const quantumInput = document.getElementById('quantum');
    const simulateBtn = document.getElementById('simulate-btn');
    const ganttChart = document.getElementById('gantt-chart');
    const metricsTable = document.getElementById('metrics-table');
    const processesTbody = document.getElementById('processes-tbody');
    const addProcessBtn = document.getElementById('add-process');

    // Mostrar/ocultar quantum para Round Robin
    algorithmSelect.addEventListener('change', function() {
        quantumContainer.classList.toggle('hidden', this.value !== 'rr');
    });

    // Agregar proceso manual
    addProcessBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="process-id" value="P${processes.length + 1}"></td>
            <td><input type="number" class="arrival-time" min="0" value="0"></td>
            <td><input type="number" class="burst-time" min="1" value="1"></td>
            <td><input type="number" class="priority" min="1" value="1"></td>
            <td><button class="delete-btn">Eliminar</button></td>
        `;
        processesTbody.appendChild(newRow);
        
        // Agregar evento al botón eliminar
        newRow.querySelector('.delete-btn').addEventListener('click', function() {
            processesTbody.removeChild(newRow);
        });
    });

    // Simular
    simulateBtn.addEventListener('click', function() {
        // Obtener procesos de la tabla
        processes = [];
        const rows = processesTbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            processes.push({
                id: row.querySelector('.process-id').value,
                arrivalTime: parseInt(row.querySelector('.arrival-time').value),
                burstTime: parseInt(row.querySelector('.burst-time').value),
                priority: parseInt(row.querySelector('.priority').value)
            });
        });
        
        if (processes.length === 0) {
            alert('Agrega al menos un proceso');
            return;
        }
        
        // Ejecutar algoritmo seleccionado
        let scheduled = [];
        const algorithm = algorithmSelect.value;
        
        switch(algorithm) {
            case 'fcfs':
                scheduled = fcfs(processes);
                break;
            case 'sjf':
                scheduled = sjf(processes);
                break;
            case 'rr':
                const quantum = parseInt(quantumInput.value);
                scheduled = roundRobin(processes, quantum);
                break;
        }
        
        // Mostrar resultados
        renderGanttChart(scheduled);
        renderMetrics(processes, scheduled);
    });

    // Algoritmo FCFS
    function fcfs(processes) {
        const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        const scheduled = [];
        
        sorted.forEach(proc => {
            const start = Math.max(currentTime, proc.arrivalTime);
            const end = start + proc.burstTime;
            scheduled.push({ pid: proc.id, start, end });
            currentTime = end;
        });
        
        return scheduled;
    }

    // Algoritmo SJF
    function sjf(processes) {
        let currentTime = 0;
        const scheduled = [];
        const queue = [...processes];
        
        while (queue.length > 0) {
            const available = queue
                .filter(p => p.arrivalTime <= currentTime)
                .sort((a, b) => a.burstTime - b.burstTime);
            
            if (available.length === 0) {
                currentTime++;
                continue;
            }
            
            const nextProcess = available[0];
            const start = currentTime;
            const end = start + nextProcess.burstTime;
            
            scheduled.push({ pid: nextProcess.id, start, end });
            currentTime = end;
            
            // Eliminar proceso de la cola
            const index = queue.findIndex(p => p.id === nextProcess.id);
            queue.splice(index, 1);
        }
        
        return scheduled;
    }

    // Algoritmo Round Robin
    function roundRobin(processes, quantum) {
        const queue = [...processes];
        const readyQueue = [];
        let currentTime = 0;
        const scheduled = [];
        
        while (queue.length > 0 || readyQueue.length > 0) {
            // Agregar procesos que ya llegaron
            while (queue.length > 0 && queue[0].arrivalTime <= currentTime) {
                readyQueue.push(queue.shift());
            }
            
            if (readyQueue.length === 0) {
                currentTime++;
                continue;
            }
            
            const currentProcess = readyQueue.shift();
            const executionTime = Math.min(quantum, currentProcess.burstTime);
            
            scheduled.push({
                pid: currentProcess.id,
                start: currentTime,
                end: currentTime + executionTime
            });
            
            currentTime += executionTime;
            currentProcess.burstTime -= executionTime;
            
            // Si aún le queda tiempo, volver a la cola
            if (currentProcess.burstTime > 0) {
                readyQueue.push(currentProcess);
            }
        }
        
        return scheduled;
    }

    // Renderizar diagrama de Gantt
    function renderGanttChart(scheduled) {
        ganttChart.innerHTML = '';
        
        if (scheduled.length === 0) return;
        
        const maxTime = scheduled[scheduled.length - 1].end;
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
        
        scheduled.forEach((block, index) => {
            const width = ((block.end - block.start) / maxTime) * 100;
            const colorIndex = parseInt(block.pid.substring(1)) % colors.length;
            
            const blockElement = document.createElement('div');
            blockElement.className = 'gantt-block';
            blockElement.style.width = `${width}%`;
            blockElement.style.backgroundColor = colors[colorIndex];
            blockElement.textContent = `${block.pid} (${block.start}-${block.end})`;
            
            ganttChart.appendChild(blockElement);
        });
    }

    // Calcular y mostrar métricas
    function renderMetrics(processes, scheduled) {
        if (scheduled.length === 0) return;
        
        // Calcular métricas por proceso
        const metrics = processes.map(proc => {
            const procScheduled = scheduled.filter(s => s.pid === proc.id);
            const firstRun = procScheduled[0];
            const lastRun = procScheduled[procScheduled.length - 1];
            
            const turnaroundTime = lastRun.end - proc.arrivalTime;
            const waitingTime = turnaroundTime - proc.burstTime;
            const responseTime = firstRun.start - proc.arrivalTime;
            
            return {
                pid: proc.id,
                turnaroundTime,
                waitingTime,
                responseTime,
                cpuUsage: (proc.burstTime / turnaroundTime * 100).toFixed(2)
            };
        });
        
        // Calcular promedios
        const avgTurnaround = metrics.reduce((sum, m) => sum + m.turnaroundTime, 0) / metrics.length;
        const avgWaiting = metrics.reduce((sum, m) => sum + m.waitingTime, 0) / metrics.length;
        const avgResponse = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
        
        // Generar tabla HTML
        let html = `
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>Proceso</th>
                        <th>T. Retorno</th>
                        <th>T. Espera</th>
                        <th>T. Respuesta</th>
                        <th>Uso CPU (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        metrics.forEach(m => {
            html += `
                <tr>
                    <td>${m.pid}</td>
                    <td>${m.turnaroundTime}</td>
                    <td>${m.waitingTime}</td>
                    <td>${m.responseTime}</td>
                    <td>${m.cpuUsage}</td>
                </tr>
            `;
        });
        
        html += `
                <tr class="avg-row">
                    <td><strong>Promedio</strong></td>
                    <td>${avgTurnaround.toFixed(2)}</td>
                    <td>${avgWaiting.toFixed(2)}</td>
                    <td>${avgResponse.toFixed(2)}</td>
                    <td>-</td>
                </tr>
            </tbody>
            </table>
        `;
        
        metricsTable.innerHTML = html;
    }

    // Agregar un proceso inicial para demostración
    addProcessBtn.click();
});