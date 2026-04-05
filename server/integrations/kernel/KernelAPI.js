/**
 * AI Kernel API Routes
 * RESTful interface to the AI Kernel system
 */

import express from 'express';
import pino from 'pino';

const logger = pino({ name: 'KernelAPI' });

export function setupKernelRoutes(app, kernel, cli) {
  const router = express.Router();

  /**
   * POST /kernel/input - Process user input
   * Accepts: { userId, input, channel?, context? }
   */
  router.post('/input', async (req, res) => {
    try {
      const { userId, input, channel, context } = req.body;

      if (!userId || !input) {
        return res.status(400).json({ error: 'userId and input required' });
      }

      const result = await kernel.processUserInput(userId, input, {
        channel: channel || 'api',
        ...context
      });

      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Error processing input');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /kernel/understand/:userId - Deep user understanding
   */
  router.get('/understand/:userId', async (req, res) => {
    try {
      const understanding = await kernel.getUserUnderstanding(req.params.userId);
      res.json(understanding);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /kernel/top - System metrics (like 'top')
   */
  router.get('/top', (req, res) => {
    res.json(kernel.getTopMetrics());
  });

  /**
   * GET /kernel/status - Kernel status
   */
  router.get('/status', (req, res) => {
    res.json(kernel.getKernelStatus());
  });

  /**
   * POST /kernel/predict/:userId - Predict next action
   */
  router.post('/predict/:userId', async (req, res) => {
    try {
      const predictions = await kernel.predictNextAction(req.params.userId);
      res.json({ userId: req.params.userId, predictions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /kernel/learn/:userId - Learning progress
   */
  router.get('/learn/:userId', async (req, res) => {
    try {
      const understanding = await kernel.getUserUnderstanding(req.params.userId);
      res.json({
        userId: req.params.userId,
        learningScore: understanding.learningScore,
        interactionCount: understanding.interactionCount,
        patterns: understanding.patterns.length,
        progress: `${understanding.learningScore.toFixed(1)}% learned`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /kernel/command - Execute CLI command
   * Accepts: { command, args }
   */
  router.post('/command', async (req, res) => {
    try {
      const { command, args } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'command required' });
      }

      const result = await cli.execute(command, args || []);
      res.json({ command, result });
    } catch (error) {
      logger.error({ error }, 'Command execution error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /kernel/export - Export kernel state
   */
  router.get('/export', (req, res) => {
    res.json(kernel.exportKernelState());
  });

  /**
   * DELETE /kernel/task/:taskId - Kill task
   */
  router.delete('/task/:taskId', (req, res) => {
    const success = kernel.killTask(req.params.taskId);
    res.json({ taskId: req.params.taskId, killed: success });
  });

  /**
   * GET /kernel/help - Show commands
   */
  router.get('/help', async (req, res) => {
    const help = await cli.cmdHelp();
    res.json(help);
  });

  /**
   * GET /kernel/health - Health check
   */
  router.get('/health', (req, res) => {
    const status = kernel.getKernelStatus();
    res.json({
      status: 'ok',
      kernel: 'AIKernel',
      uptime: status.uptime,
      users: status.users,
      memory: status.memory
    });
  });

  app.use('/kernel', router);
  logger.info('✅ Kernel API routes registered');
}

export default setupKernelRoutes;
