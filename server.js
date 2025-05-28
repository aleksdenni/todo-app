const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Для статичних файлів (HTML, CSS, JS)

// Утиліти для роботи з файлом
async function readTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Файл не існує, створюємо порожній масив
            return [];
        }
        throw error;
    }
}

async function writeTasks(tasks) {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API Routes

// Отримати всі завдання
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await readTasks();
        res.json({ 
            success: true, 
            tasks: tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        });
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка читання завдань' 
        });
    }
});

// Додати нове завдання
app.post('/api/tasks', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Текст завдання не може бути порожнім' 
            });
        }
        
        if (text.length > 200) {
            return res.status(400).json({ 
                success: false, 
                error: 'Текст завдання занадто довгий (максимум 200 символів)' 
            });
        }
        
        const tasks = await readTasks();
        const newTask = {
            id: generateId(),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        await writeTasks(tasks);
        
        res.status(201).json({ 
            success: true, 
            task: newTask 
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка створення завдання' 
        });
    }
});

// Оновити завдання
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed, text } = req.body;
        
        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Завдання не знайдено' 
            });
        }
        
        const task = tasks[taskIndex];
        
        if (typeof completed === 'boolean') {
            task.completed = completed;
        }
        
        if (text && typeof text === 'string' && text.trim().length > 0) {
            if (text.length > 200) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Текст завдання занадто довгий (максимум 200 символів)' 
                });
            }
            task.text = text.trim();
        }
        
        task.updatedAt = new Date().toISOString();
        
        await writeTasks(tasks);
        
        res.json({ 
            success: true, 
            task: task 
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка оновлення завдання' 
        });
    }
});

// Видалити завдання
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Завдання не знайдено' 
            });
        }
        
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        await writeTasks(tasks);
        
        res.json({ 
            success: true, 
            task: deletedTask 
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка видалення завдання' 
        });
    }
});

// Видалити всі виконані завдання
app.delete('/api/tasks/completed/all', async (req, res) => {
    try {
        const tasks = await readTasks();
        const remainingTasks = tasks.filter(task => !task.completed);
        const deletedCount = tasks.length - remainingTasks.length;
        
        await writeTasks(remainingTasks);
        
        res.json({ 
            success: true, 
            deletedCount,
            message: `Видалено ${deletedCount} виконаних завдань` 
        });
    } catch (error) {
        console.error('Error deleting completed tasks:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка видалення виконаних завдань' 
        });
    }
});

// Статистика
app.get('/api/stats', async (req, res) => {
    try {
        const tasks = await readTasks();
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.completed).length,
            pending: tasks.filter(t => !t.completed).length,
            createdToday: tasks.filter(t => {
                const today = new Date().toDateString();
                const taskDate = new Date(t.createdAt).toDateString();
                return today === taskDate;
            }).length
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Помилка отримання статистики' 
        });
    }
});

// Глобальний обробник помилок
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Внутрішня помилка сервера' 
    });
});

// 404 обробник
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Ендпоінт не знайдено' 
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 ToDo сервер запущено на http://localhost:${PORT}`);
    console.log(`📁 Завдання зберігаються в файлі: ${TASKS_FILE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Отримано SIGTERM, закриваємо сервер...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Отримано SIGINT, закриваємо сервер...');
    process.exit(0);
});