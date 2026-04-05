/**
 * OMNIUS Phase 5 - OpenClaw Integration
 * 
 * Extends AdvancedServer with:
 * - OpenClaw multi-channel gateway integration
 * - 23+ messaging platforms support
 * - Voice integration (ElevenLabs TTS/STT + wake words)
 * - Canvas/visual workspace (A2UI protocol)
 * - Skills marketplace (5,400+ automations)
 * - Multi-agent routing
 */

'use strict';

import OpenClawBridge from './integrations/openclaw/OpenClawBridge.js';
import { ChannelHandlerFactory } from './integrations/openclaw/channels/ChannelHandlers.js';
import VoiceIntegration from './integrations/openclaw/tools/VoiceIntegration.js';
import CanvasIntegration from './integrations/openclaw/tools/CanvasIntegration.js';
import { SkillsManager } from './integrations/openclaw/skills/SkillsManager.js';
import pino from 'pino';

const logger = pino({ name: 'OpenClawIntegration' });

/**
 * OpenClaw Integration Module
 * Attach to existing OMNIUS server
 */
export class OpenClawIntegration {
  constructor(omniumServer) {
    this.server = omniumServer;
    this.bridge = null;
    this.voiceService = null;
    this.canvasService = null;
    this.skillsManager = null;
  }

  /**
   * Initialize all OpenClaw components
   */
  async initialize() {
    logger.info('🦞 Initializing OpenClaw Integration (Phase 5)...');

    try {
      // 1. Initialize Voice Service
      this.voiceService = new VoiceIntegration(this.server, {
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
        googleSTTKey: process.env.GOOGLE_STT_KEY,
        voiceWakeEnabled: true,
        talkModeEnabled: true
      });
      await this.voiceService.initialize();
      logger.info('✅ Voice Integration ready (23+ platforms)');

      // 2. Initialize Canvas Service
      this.canvasService = new CanvasIntegration(this.server);
      await this.canvasService.initialize();
      logger.info('✅ Canvas Integration ready (visual workspace)');

      // 3. Initialize Skills Manager
      this.skillsManager = new SkillsManager(this.server);
      await this.skillsManager.initialize();
      logger.info(`✅ Skills Manager ready (${this.skillsManager.skills.size}+ skills)`);

      // 4. Initialize OpenClaw Bridge
      this.bridge = new OpenClawBridge(this.server, {
        gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789',
        gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || 'default-token',
        channels: {
          whatsapp: { enabled: true },
          telegram: { enabled: true },
          slack: { enabled: true },
          discord: { enabled: true },
          teams: { enabled: true },
          googlechat: { enabled: true },
          signal: { enabled: false },
          imessage: { enabled: false },
          wechat: { enabled: false },
          matrix: { enabled: true },
          mattermost: { enabled: true },
          feishu: { enabled: true },
          line: { enabled: true },
          irc: { enabled: true },
          zalo: { enabled: true },
          synology_chat: { enabled: true },
          tlon: { enabled: true },
          twitch: { enabled: true },
          nostr: { enabled: true },
          nextcloud_talk: { enabled: true },
          webchat: { enabled: true },
          macos: { enabled: true },
          ios: { enabled: true },
          android: { enabled: true }
        }
      });

      // Inject services into bridge
      this.bridge.voiceService = this.voiceService;
      this.bridge.canvasService = this.canvasService;
      this.bridge.skillsManager = this.skillsManager;

      // Initialize bridge
      await this.bridge.initialize();
      logger.info('✅ OpenClaw Bridge ready (23 channels + voice + canvas + skills)');

      // 5. Setup event listeners
      this.setupEventListeners();

      // 6. Setup API routes
      this.setupRoutes();

      logger.info('🦞 ✅ OpenClaw Integration (Phase 5) fully initialized!');
      return true;
    } catch (error) {
      logger.error({ error }, '❌ OpenClaw Integration failed');
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.bridge.on('gateway-connected', () => {
      logger.info('🔗 OpenClaw Gateway connected');
    });

    this.bridge.on('gateway-disconnected', () => {
      logger.warn('⚠️ OpenClaw Gateway disconnected');
    });

    this.bridge.on('session-created', (data) => {
      logger.info({ sessionId: data.sessionId }, '📱 New OpenClaw session');
    });

    this.bridge.on('gateway-error', (error) => {
      logger.error({ error }, '❌ Gateway error');
    });
  }

  /**
   * Setup API routes for OpenClaw integration
   */
  setupRoutes() {
    const app = this.server.app;

    // Health check
    app.get('/openclaw/health', (req, res) => {
      res.json({
        status: 'ok',
        bridge: this.bridge.connected ? 'connected' : 'disconnected',
        sessions: this.bridge.getActiveSessions().length,
        skills: this.skillsManager.skills.size,
        channels: Array.from(this.bridge.channelHandlers.keys()).length,
        timestamp: new Date()
      });
    });

    // Get active sessions
    app.get('/openclaw/sessions', (req, res) => {
      const sessions = this.bridge.getActiveSessions();
      res.json({
        count: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          userId: s.userId,
          channels: s.channels,
          messagesCount: s.messages.length,
          createdAt: s.metadata.createdAt
        }))
      });
    });

    // Get session details
    app.get('/openclaw/sessions/:sessionId', (req, res) => {
      const session = this.bridge.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        id: session.id,
        userId: session.userId,
        channels: session.channels,
        messages: session.messages,
        metadata: session.metadata
      });
    });

    // Get skills
    app.get('/openclaw/skills', (req, res) => {
      const { category, search } = req.query;
      let skills;

      if (search) {
        skills = this.skillsManager.searchSkills(search, category);
      } else if (category) {
        skills = this.skillsManager.getSkillsByCategory(category);
      } else {
        skills = Array.from(this.skillsManager.skills.values());
      }

      res.json({
        count: skills.length,
        skills: skills.slice(0, 20).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          verified: s.verified,
          rating: s.rating,
          downloads: s.downloads
        }))
      });
    });

    // Get skill details
    app.get('/openclaw/skills/:skillId', (req, res) => {
      const skill = this.skillsManager.getSkill(req.params.skillId);
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      res.json({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        version: skill.version,
        author: skill.author,
        verified: skill.verified,
        params: skill.params,
        rating: skill.rating,
        downloads: skill.downloads
      });
    });

    // Execute skill
    app.post('/openclaw/skills/:skillId/execute', async (req, res) => {
      try {
        const result = await this.skillsManager.executeSkill(
          req.params.skillId,
          req.body,
          { userId: req.body.userId, sessionId: req.body.sessionId }
        );

        res.json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Get voice info
    app.get('/openclaw/voice', (req, res) => {
      res.json({
        enabled: this.voiceService.config.voiceWakeEnabled,
        talkMode: this.voiceService.config.talkModeEnabled,
        activeSessions: this.voiceService.getActiveSessions().length,
        wakeWords: this.voiceService.config.wakeWords
      });
    });

    // Start voice session
    app.post('/openclaw/voice/session', async (req, res) => {
      try {
        const { userId, platform } = req.body;
        const result = await this.voiceService.startVoiceSession(userId, platform);
        res.json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Get canvas info
    app.get('/openclaw/canvas', (req, res) => {
      const userId = req.query.userId;
      const canvases = userId ? this.canvasService.getUserCanvases(userId) : [];

      res.json({
        count: canvases.length,
        canvases: canvases.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          elementCount: c.elements.length,
          createdAt: c.metadata.createdAt
        }))
      });
    });

    // Create canvas
    app.post('/openclaw/canvas', (req, res) => {
      try {
        const { userId, title, type } = req.body;
        const canvas = this.canvasService.createCanvas(userId, { title, type });
        res.json({
          id: canvas.id,
          title: canvas.title,
          type: canvas.type,
          metadata: canvas.metadata
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Get canvas
    app.get('/openclaw/canvas/:canvasId', (req, res) => {
      const canvas = this.canvasService.getCanvas(req.params.canvasId);
      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      const a2ui = this.canvasService.renderCanvas(req.params.canvasId);
      res.json(a2ui);
    });

    // Get channels info
    app.get('/openclaw/channels', (req, res) => {
      const channels = Array.from(this.bridge.channelHandlers.entries()).map(([id, handler]) => ({
        id,
        connected: handler.connected,
        handler: handler.handler
      }));

      res.json({
        count: channels.length,
        channels,
        supportedChannels: ChannelHandlerFactory.getSupportedChannels()
      });
    });

    // Get integration stats
    app.get('/openclaw/stats', (req, res) => {
      res.json({
        skills: this.skillsManager.getStats(),
        sessions: {
          total: this.bridge.getActiveSessions().length,
          voice: this.voiceService.getActiveSessions().length
        },
        channels: this.bridge.channelHandlers.size,
        canvases: this.canvasService.canvases.size,
        bridge: {
          connected: this.bridge.connected,
          reconnectAttempts: this.bridge.reconnectAttempts
        }
      });
    });

    logger.info('✅ OpenClaw API routes registered');
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      openClaw: {
        connected: this.bridge?.connected,
        gateway: this.bridge?.config.gatewayUrl,
        channelCount: this.bridge?.channelHandlers.size,
        sessionCount: this.bridge?.getActiveSessions().length,
        skillCount: this.skillsManager?.skills.size,
        activeVoiceSessions: this.voiceService?.getActiveSessions().length,
        activeCanvases: this.canvasService?.canvases.size
      }
    };
  }

  /**
   * Close integration
   */
  async close() {
    logger.info('Closing OpenClaw Integration...');

    if (this.bridge) {
      await this.bridge.close();
    }

    logger.info('✅ OpenClaw Integration closed');
  }
}

export default OpenClawIntegration;
