/**
 * AI KERNEL CLI - Like Bash/Shell but for AI
 * 
 * Commands:
 * - understand <user> - Deep understanding of user
 * - top - Show metrics like 'top'
 * - uname - Kernel info
 * - ps - Running tasks
 * - kill <task> - Stop task
 * - predict <user> - Predict next action
 * - status - System status
 * - learn <user> - Show learning progress
 * - export - Export kernel state
 */

'use strict';

import pino from 'pino';

const logger = pino({ name: 'KernelCLI' });

export class KernelCLI {
  constructor(kernel) {
    this.kernel = kernel;
    this.commands = {
      'understand': this.cmdUnderstand.bind(this),
      'top': this.cmdTop.bind(this),
      'uname': this.cmdUname.bind(this),
      'ps': this.cmdPs.bind(this),
      'kill': this.cmdKill.bind(this),
      'predict': this.cmdPredict.bind(this),
      'status': this.cmdStatus.bind(this),
      'learn': this.cmdLearn.bind(this),
      'export': this.cmdExport.bind(this),
      'help': this.cmdHelp.bind(this)
    };
  }

  /**
   * Execute command
   */
  async execute(command, args = []) {
    const handler = this.commands[command];
    if (!handler) {
      return { error: `Unknown command: ${command}` };
    }

    try {
      return await handler(...args);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * understand <user> - Deep understanding
   */
  async cmdUnderstand(userId) {
    return await this.kernel.getUserUnderstanding(userId);
  }

  /**
   * top - Show metrics
   */
  async cmdTop() {
    return this.kernel.getTopMetrics();
  }

  /**
   * uname - Kernel info
   */
  async cmdUname() {
    return this.kernel.getKernelStatus();
  }

  /**
   * ps - Running tasks
   */
  async cmdPs() {
    const status = this.kernel.getKernelStatus();
    return {
      queued: status.scheduler.queued,
      running: status.scheduler.running,
      details: 'Use: ps -aux for details'
    };
  }

  /**
   * kill <taskId>
   */
  async cmdKill(taskId) {
    const success = this.kernel.killTask(taskId);
    return { success, message: success ? `Task ${taskId} killed` : 'Task not found' };
  }

  /**
   * predict <user> - Next action
   */
  async cmdPredict(userId) {
    const understanding = await this.kernel.getUserUnderstanding(userId);
    return {
      userId,
      predictions: understanding.predictedNeeds || [],
      confidence: 'See predictions array for confidence scores'
    };
  }

  /**
   * status - System status
   */
  async cmdStatus() {
    return this.kernel.getKernelStatus();
  }

  /**
   * learn <user> - Learning progress
   */
  async cmdLearn(userId) {
    const understanding = await this.kernel.getUserUnderstanding(userId);
    return {
      userId,
      learningScore: understanding.learningScore,
      interactionCount: understanding.interactionCount,
      patterns: understanding.patterns.length,
      message: `${understanding.learningScore.toFixed(1)}% learned after ${understanding.interactionCount} interactions`
    };
  }

  /**
   * export - Export state
   */
  async cmdExport() {
    return this.kernel.exportKernelState();
  }

  /**
   * help - Show commands
   */
  async cmdHelp() {
    return {
      commands: Object.keys(this.commands),
      description: 'AI Kernel CLI - Natural language shell for OMNIUS+OpenClaw',
      examples: [
        'understand user123 - Deep understanding of user',
        'top - Show system metrics',
        'predict user123 - Predict next action',
        'learn user123 - Show learning progress',
        'status - System status',
        'help - Show this help'
      ]
    };
  }
}

export default KernelCLI;
