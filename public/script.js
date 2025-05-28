class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.baseURL = 'http://localhost:3000/api'; // Змініть на ваш сервер
        
        this.initElements();
        this.bindEvents();
        this.loadTasks();
    }
    
    initElements() {
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.tasksList = document.getElementById('tasksList');
        this.tasksCount = document.getElementById('tasksCount');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.filterBtns = document.querySelectorAll('.filter-btn');
    }
    
    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
    }
    
    showLoading() {
        this.loading.classList.remove('hidden');
        this.error.classList.add('hidden');
    }
    
    hideLoading() {
        this.loading.classList.add('hidden');
    }
    
    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        this.hideLoading();
    }
    
    hideError() {
        this.error.classList.add('hidden');
    }
    
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Не вдається підключитися до сервера. Переконайтеся, що сервер запущено.');
            }
            throw error;
        }
    }
    
    async loadTasks() {
        this.showLoading();
        try {
            const data = await this.makeRequest(`${this.baseURL}/tasks`);
            this.tasks = data.tasks || [];
            this.renderTasks();
            this.updateStats();
            this.hideError();
        } catch (error) {
            this.showError(`Помилка завантаження: ${error.message}`);
            console.error('Load tasks error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    async addTask() {
        const text = this.taskInput.value.trim();
        if (!text) {
            this.taskInput.focus();
            return;
        }
        
        this.showLoading();
        try {
            const data = await this.makeRequest(`${this.baseURL}/tasks`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            
            this.tasks.push(data.task);
            this.taskInput.value = '';
            this.renderTasks();
            this.updateStats();
            this.hideError();
        } catch (error) {
            this.showError(`Помилка додавання: ${error.message}`);
            console.error('Add task error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    async toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        this.showLoading();
        try {
            const data = await this.makeRequest(`${this.baseURL}/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ completed: !task.completed })
            });
            
            task.completed = data.task.completed;
            this.renderTasks();
            this.updateStats();
            this.hideError();
        } catch (error) {
            this.showError(`Помилка оновлення: ${error.message}`);
            console.error('Toggle task error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    async deleteTask(id) {
        if (!confirm('Ви впевнені, що хочете видалити це завдання?')) {
            return;
        }
        
        this.showLoading();
        try {
            await this.makeRequest(`${this.baseURL}/tasks/${id}`, {
                method: 'DELETE'
            });
            
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.renderTasks();
            this.updateStats();
            this.hideError();
        } catch (error) {
            this.showError(`Помилка видалення: ${error.message}`);
            console.error('Delete task error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
    }
    
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            default:
                return this.tasks;
        }
    }
    
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.tasksList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3em; margin-bottom: 15px; opacity: 0.5;">📝</div>
                    <p>${this.currentFilter === 'all' ? 'Поки що немає завдань' : 
                         this.currentFilter === 'completed' ? 'Немає виконаних завдань' : 
                         'Немає активних завдань'}</p>
                </div>
            `;
            return;
        }
        
        this.tasksList.innerHTML = filteredTasks.map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''}
                    onchange="todoApp.toggleTask('${task.id}')"
                >
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="delete-btn" onclick="todoApp.deleteTask('${task.id}')">
                        Видалити
                    </button>
                </div>
            </li>
        `).join('');
    }
    
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        this.tasksCount.textContent = `Всього: ${total} | Виконано: ${completed} | Залишилось: ${pending}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Ініціалізація додатку
let todoApp;
document.addEventListener('DOMContentLoaded', () => {
    todoApp = new TodoApp();
});