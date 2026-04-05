/**
 * Task Scheduler - Real task scheduling with cron and recurring tasks
 * Uses node-schedule for cron jobs
 * 
 * REAL scheduling - actually executes tasks
 */

import schedule from 'node-schedule';
import nodeCron from 'node-cron';
import db from '../utils/database.js';

class TaskSchedulerService {
  constructor() {
    this.tasks = new Map();
    this.jobs = new Map();
  }

  /**
   * Schedule task with cron expression
   * REAL - Actually runs on schedule
   */
  async scheduleTask(userId, taskName, cronExpression, callback, data = {}) {
    try {
      // Validate cron expression
      if (!nodeCron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Schedule the task
      const task = nodeCron.schedule(cronExpression, async () => {
        console.log(`⏰ Executing scheduled task: ${taskName}`);

        try {
          const result = await callback(data);
          db.log('info', `Task executed: ${taskName}`, {
            taskId,
            success: true,
            result
          });
        } catch (error) {
          db.log('error', `Task failed: ${taskName}`, {
            taskId,
            error: error.message
          });
        }
      });

      // Store task reference
      this.tasks.set(taskId, {
        userId,
        name: taskName,
        cron: cronExpression,
        status: 'active',
        createdAt: new Date(),
        data
      });

      this.jobs.set(taskId, task);

      console.log(`✅ Task scheduled: ${taskName} (${cronExpression})`);

      return {
        taskId,
        name: taskName,
        cron: cronExpression,
        status: 'scheduled'
      };
    } catch (error) {
      throw new Error(`Failed to schedule task: ${error.message}`);
    }
  }

  /**
   * Schedule one-time task (delay-based)
   */
  async scheduleOneTimeTask(userId, taskName, delayMs, callback, data = {}) {
    return new Promise((resolve) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const timer = setTimeout(async () => {
        console.log(`⏰ Executing one-time task: ${taskName}`);

        try {
          const result = await callback(data);
          db.log('info', `One-time task executed: ${taskName}`, {
            taskId,
            success: true,
            result
          });
          resolve({ success: true, result });
        } catch (error) {
          db.log('error', `One-time task failed: ${taskName}`, {
            taskId,
            error: error.message
          });
          resolve({ success: false, error: error.message });
        }
      }, delayMs);

      this.tasks.set(taskId, {
        userId,
        name: taskName,
        type: 'one-time',
        delay: delayMs,
        status: 'pending',
        createdAt: new Date()
      });

      this.jobs.set(taskId, timer);

      resolve({
        taskId,
        name: taskName,
        delay: delayMs,
        status: 'scheduled'
      });
    });
  }

  /**
   * Schedule task to run at specific time
   */
  async scheduleAtTime(userId, taskName, dateTime, callback, data = {}) {
    try {
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const job = schedule.scheduleJob(date, async () => {
        console.log(`⏰ Executing scheduled task: ${taskName}`);

        try {
          const result = await callback(data);
          db.log('info', `Scheduled task executed: ${taskName}`, {
            taskId,
            success: true,
            result
          });
        } catch (error) {
          db.log('error', `Scheduled task failed: ${taskName}`, {
            taskId,
            error: error.message
          });
        }
      });

      this.tasks.set(taskId, {
        userId,
        name: taskName,
        type: 'scheduled-time',
        scheduledFor: date,
        status: 'pending',
        createdAt: new Date()
      });

      this.jobs.set(taskId, job);

      return {
        taskId,
        name: taskName,
        scheduledFor: date,
        status: 'scheduled'
      };
    } catch (error) {
      throw new Error(`Failed to schedule task: ${error.message}`);
    }
  }

  /**
   * Retry task with exponential backoff
   */
  async retryTask(taskId, callback, maxRetries = 3, backoffMultiplier = 2) {
    let delay = 1000; // Start with 1 second
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Task attempt ${attempt}/${maxRetries}`);
        const result = await callback();
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= backoffMultiplier;
        }
      }
    }

    throw new Error(`Task failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Queue task for processing
   * FIFO queue
   */
  async queueTask(userId, taskName, callback, data = {}, priority = 0) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task = {
      taskId,
      userId,
      name: taskName,
      callback,
      data,
      priority,
      status: 'queued',
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);

    // Process immediately if high priority
    if (priority > 5) {
      await this.processTask(taskId);
    }

    return {
      taskId,
      name: taskName,
      status: 'queued',
      priority
    };
  }

  /**
   * Process queued task
   */
  async processTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    try {
      task.status = 'processing';
      console.log(`▶️  Processing task: ${task.name}`);

      const result = await task.callback(task.data);

      task.status = 'completed';
      task.result = result;

      db.log('info', `Task completed: ${task.name}`, {
        taskId,
        result
      });

      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;

      db.log('error', `Task failed: ${task.name}`, {
        taskId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      taskId,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt,
      result: task.result,
      error: task.error
    };
  }

  /**
   * List all tasks
   */
  listTasks(userId, status = null) {
    const userTasks = Array.from(this.tasks.values()).filter(
      task => task.userId === userId && (!status || task.status === status)
    );

    return userTasks.map(task => ({
      taskId: task.taskId,
      name: task.name,
      status: task.status,
      type: task.cron ? 'recurring' : 'one-time',
      createdAt: task.createdAt
    }));
  }

  /**
   * Cancel task
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const job = this.jobs.get(taskId);
    if (job) {
      if (job.cancel) {
        job.cancel(); // For schedule.js
      } else if (job.stop) {
        job.stop(); // For node-cron
      } else {
        clearTimeout(job); // For setTimeout
      }
      this.jobs.delete(taskId);
    }

    task.status = 'cancelled';
    console.log(`⛔ Task cancelled: ${task.name}`);

    return { success: true, taskId };
  }

  /**
   * Common cron patterns
   */
  static PATTERNS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY_9AM: '0 9 * * *',
    DAILY_MIDNIGHT: '0 0 * * *',
    WEEKLY_MONDAY_9AM: '0 9 * * 1',
    MONTHLY_FIRST_DAY: '0 0 1 * *',
    WEEKDAY_9AM: '0 9 * * 1-5',
    WEEKEND_10AM: '0 10 * * 0,6'
  };

  /**
   * Create recurring task from preset pattern
   */
  async createRecurringTask(userId, taskName, pattern, callback, data = {}) {
    const cronExpression = TaskSchedulerService.PATTERNS[pattern];
    if (!cronExpression) {
      throw new Error(`Unknown pattern: ${pattern}`);
    }

    return this.scheduleTask(userId, taskName, cronExpression, callback, data);
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const allTasks = Array.from(this.tasks.values());

    return {
      total: allTasks.length,
      active: allTasks.filter(t => t.status === 'active').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length,
      queued: allTasks.filter(t => t.status === 'queued').length,
      recurring: allTasks.filter(t => t.cron).length,
      oneTime: allTasks.filter(t => !t.cron).length
    };
  }
}

export default new TaskSchedulerService();
