/**
 * OpenClaw Bridge - Core Integration Module
 * Connects OMNIUS to OpenClaw gateway for multi-channel AI assistance
 * 
 * Features:
 * - Multi-channel routing (23 platforms)
 * - LLM router integration
 * - Context memory bridge
 * - Skill management
 * - Session persistence
 * - Voice support
 * - Canvas/visual interface
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'OpenClawBridge' });

export class OpenClawBridge extends EventEmitter {
  constructor(omniumServer, config = {}) {
    super();
    this.omnius = omniumServer;
    this.config = {
      gatewayUrl: config.gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789',
      gatewayToken: config.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN || 'default-token',
      workspacePath: config.workspacePath || process.env.OPENCLAW_WORKSPACE || '~/.openclaw',
      channels: config.channels || this.getDefaultChannels(),
      voiceEnabled: config.voiceEnabled !== false,
      canvasEnabled: config.canvasEnabled !== false,
      maxContextSize: config.maxContextSize || 20,
      sessionTTL: config.sessionTTL || 2592000, // 30 days
      ...config
    };

    this.gateway = null;
    this.sessions = new Map();
    this.agents = new Map();
    this.skills = new Map();
    this.channelHandlers = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Default channel configuration
   */
  getDefaultChannels() {
    return {
      whatsapp: { enabled: true, handler: 'WhatsAppHandler' },
      telegram: { enabled: true, handler: 'TelegramHandler' },
      slack: { enabled: true, handler: 'SlackHandler' },
      discord: { enabled: true, handler: 'DiscordHandler' },
      teams: { enabled: true, handler: 'TeamsHandler' },
      googlechat: { enabled: true, handler: 'GoogleChatHandler' },
      signal: { enabled: false, handler: 'SignalHandler' },
      imessage: { enabled: false, handler: 'iMessageHandler' },
      wechat: { enabled: false, handler: 'WeChatHandler' },
      matrix: { enabled: true, handler: 'MatrixHandler' },
      mattermost: { enabled: true, handler: 'MattermostHandler' },
      feishu: { enabled: true, handler: 'FeishuHandler' },
      line: { enabled: true, handler: 'LineHandler' },
      irc: { enabled: true, handler: 'IRCHandler' },
      zalo: { enabled: true, handler: 'ZaloHandler' },
      synology_chat: { enabled: true, handler: 'SynologyChatHandler' },
      tlon: { enabled: true, handler: 'TlonHandler' },
      twitch: { enabled: true, handler: 'TwitchHandler' },
      nostr: { enabled: true, handler: 'NostrHandler' },
      nextcloud_talk: { enabled: true, handler: 'NextcloudTalkHandler' },
      webchat: { enabled: true, handler: 'WebChatHandler' },
      macos: { enabled: true, handler: 'macOSNodeHandler' },
      ios: { enabled: true, handler: 'iOSNodeHandler' },
      android: { enabled: true, handler: 'AndroidNodeHandler' }
    };
  }

  /**
   * Initialize OpenClaw Bridge
   */
  async initialize() {
    try {
      logger.info('Initializing OpenClaw Bridge...');

      // Initialize channel handlers
      this.initializeChannelHandlers();

      // Initialize agent runtime
      this.initializeAgents();

      // Load and register skills
      await this.loadSkills();

      // Connect to OpenClaw gateway
      await this.connectGateway();

      logger.info('✅ OpenClaw Bridge initialized successfully');
      return true;
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize OpenClaw Bridge');
      throw error;
    }
  }

  /**
   * Initialize channel handlers for all 23 platforms
   */
  initializeChannelHandlers() {
    logger.info('Initializing channel handlers for 23 platforms...');

    const enabledChannels = Object.entries(this.config.channels)
      .filter(([_, config]) => config.enabled)
      .map(([channel, _]) => channel);

    logger.info(`Enabled channels: ${enabledChannels.join(', ')}`);

    for (const [channelId, channelConfig] of Object.entries(this.config.channels)) {
      if (channelConfig.enabled) {
        this.channelHandlers.set(channelId, {
          id: channelId,
          handler: channelConfig.handler,
          config: channelConfig,
          connected: false,
          metadata: {}
        });
      }
    }

    logger.info(`✅ Initialized ${this.channelHandlers.size} channel handlers`);
  }

  /**
   * Initialize agent runtime
   */
  initializeAgents() {
    logger.info('Initializing agent runtime...');

    // Default agent
    this.agents.set('default', {
      id: 'default',
      name: 'OMNIUS',
      workspace: this.config.workspacePath,
      model: 'groq/mixtral-8x7b',
      models: [
        'ollama/mistral',
        'groq/mixtral-8x7b',
        'openai/gpt-4',
        'anthropic/claude-opus',
        'xai/grok-2'
      ],
      sessions: new Map(),
      skills: new Map(),
      context: new Map()
    });

    logger.info('✅ Agent runtime initialized');
  }

  /**
   * Connect to OpenClaw gateway
   */
  async connectGateway() {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Connecting to OpenClaw Gateway: ${this.config.gatewayUrl}`);

        this.gateway = new WebSocket(this.config.gatewayUrl, {
          headers: {
            'Authorization': `Bearer ${this.config.gatewayToken}`,
            'X-Agent-Id': 'omnius-openclaw-bridge'
          }
        });

        this.gateway.on('open', () => {
          logger.info('✅ Connected to OpenClaw Gateway');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('gateway-connected');

          // Authenticate
          this.gateway.send(JSON.stringify({
            type: 'auth',
            token: this.config.gatewayToken,
            agentId: 'omnius-openclaw-bridge'
          }));

          resolve();
        });

        this.gateway.on('message', (data) => {
          this.handleGatewayMessage(JSON.parse(data));
        });

        this.gateway.on('error', (error) => {
          logger.error({ error }, 'Gateway connection error');
          this.handleGatewayError(error);
        });

        this.gateway.on('close', () => {
          logger.warn('Gateway connection closed');
          this.connected = false;
          this.emit('gateway-disconnected');
          this.attemptReconnect();
        });
      } catch (error) {
        logger.error({ error }, 'Failed to connect to gateway');
        reject(error);
      }
    });
  }

  /**
   * Handle messages from OpenClaw Gateway
   */
  async handleGatewayMessage(message) {
    const { type, data, sessionId, channelId, userId } = message;

    try {
      switch (type) {
        case 'message':
          await this.handleIncomingMessage(data, sessionId, channelId, userId);
          break;

        case 'voice':
          await this.handleVoiceInput(data, sessionId, userId);
          break;

        case 'tool_request':
          await this.handleToolRequest(data, sessionId);
          break;

        case 'session_created':
          this.handleSessionCreated(data);
          break;

        case 'skill_trigger':
          await this.handleSkillTrigger(data, sessionId, userId);
          break;

        default:
          logger.debug({ type }, 'Unknown message type from gateway');
      }
    } catch (error) {
      logger.error({ error, message }, 'Error handling gateway message');
      this.sendGatewayMessage('error', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Handle incoming message from any channel
   */
  async handleIncomingMessage(data, sessionId, channelId, userId) {
    const { text, metadata, media } = data;

    logger.info({
      channelId,
      userId,
      text: text?.substring(0, 50)
    }, 'Incoming message');

    // Get or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId, userId, channelId);
    }

    // Enrich with context
    const enrichedContext = await this.enrichContext(userId, sessionId, session);

    // Route through OMNIUS LLM Router
    const response = await this.omnius.llmRouter.generate({
      prompt: text,
      context: enrichedContext,
      model: 'auto',
      temperature: 0.7,
      maxTokens: 500
    });

    // Store in session
    session.messages.push({
      role: 'user',
      content: text,
      channel: channelId,
      timestamp: Date.now()
    });

    session.messages.push({
      role: 'assistant',
      content: response,
      channel: channelId,
      timestamp: Date.now()
    });

    // Save session
    await this.persistSession(session);

    // Execute any automation actions detected
    const actions = await this.detectAndExecuteActions(response, userId, channelId);

    // Send response back through OpenClaw
    this.sendGatewayMessage('message_response', {
      sessionId,
      channelId,
      userId,
      text: response,
      actions,
      media: []
    });

    logger.info(`✅ Processed message for user ${userId} on ${channelId}`);
  }

  /**
   * Handle voice input
   */
  async handleVoiceInput(data, sessionId, userId) {
    const { audioBase64, language = 'en' } = data;

    logger.info({ userId, language }, 'Received voice input');

    // Transcribe audio using OMNIUS TTS service
    const transcription = await this.omnius.voiceService.transcribe({
      audio: audioBase64,
      language
    });

    logger.info({ transcription }, 'Voice transcribed');

    // Process as regular message
    await this.handleIncomingMessage(
      { text: transcription },
      sessionId,
      'voice',
      userId
    );
  }

  /**
   * Handle tool requests from OpenClaw
   */
  async handleToolRequest(data, sessionId) {
    const { toolName, params } = data;

    logger.info({ toolName, params }, 'Tool request');

    try {
      let result;

      switch (toolName) {
        case 'browser':
          result = await this.omnius.browserPool.execute(params);
          break;

        case 'email':
          result = await this.omnius.automation.sendEmail(params);
          break;

        case 'calendar':
          result = await this.omnius.automation.createCalendarEvent(params);
          break;

        case 'tasks':
          result = await this.omnius.automation.createTask(params);
          break;

        case 'webhook':
          result = await this.omnius.automation.triggerWebhook(params);
          break;

        case 'script':
          result = await this.omnius.automation.executeScript(params);
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      this.sendGatewayMessage('tool_result', {
        sessionId,
        toolName,
        result,
        success: true
      });
    } catch (error) {
      logger.error({ error, toolName }, 'Tool execution failed');

      this.sendGatewayMessage('tool_result', {
        sessionId,
        toolName,
        error: error.message,
        success: false
      });
    }
  }

  /**
   * Handle skill trigger from marketplace
   */
  async handleSkillTrigger(data, sessionId, userId) {
    const { skillId, params } = data;

    logger.info({ skillId, userId }, 'Skill triggered');

    const skill = this.skills.get(skillId);
    if (!skill) {
      logger.error({ skillId }, 'Skill not found');
      return;
    }

    try {
      const result = await skill.execute(params, {
        userId,
        sessionId,
        omnius: this.omnius
      });

      this.sendGatewayMessage('skill_result', {
        sessionId,
        skillId,
        result,
        success: true
      });
    } catch (error) {
      logger.error({ error, skillId }, 'Skill execution failed');

      this.sendGatewayMessage('skill_result', {
        sessionId,
        skillId,
        error: error.message,
        success: false
      });
    }
  }

  /**
   * Load skills from skill registry
   */
  async loadSkills() {
    logger.info('Loading skills...');

    // Export OMNIUS automations as skills
    const omniumSkills = [
      {
        id: 'send-email',
        name: 'Send Email',
        description: 'Send email via Gmail',
        category: 'communication',
        execute: async (params) => {
          return this.omnius.automation.sendEmail(params);
        }
      },
      {
        id: 'create-calendar-event',
        name: 'Create Calendar Event',
        description: 'Create Google Calendar event',
        category: 'calendar',
        execute: async (params) => {
          return this.omnius.automation.createCalendarEvent(params);
        }
      },
      {
        id: 'create-task',
        name: 'Create Task',
        description: 'Create task in task manager',
        category: 'productivity',
        execute: async (params) => {
          return this.omnius.automation.createTask(params);
        }
      },
      {
        id: 'scrape-web',
        name: 'Scrape Website',
        description: 'Scrape content from website',
        category: 'web',
        execute: async (params) => {
          return this.omnius.automation.scrapeWebsite(params);
        }
      },
      {
        id: 'schedule-email',
        name: 'Schedule Email',
        description: 'Schedule email for later',
        category: 'communication',
        execute: async (params) => {
          return this.omnius.automation.scheduleEmail(params);
        }
      },
      {
        id: 'filter-emails',
        name: 'Filter Emails',
        description: 'Apply filters to Gmail',
        category: 'email',
        execute: async (params) => {
          return this.omnius.automation.filterEmails(params);
        }
      },
      {
        id: 'trigger-webhook',
        name: 'Trigger Webhook',
        description: 'Send data to webhook',
        category: 'integration',
        execute: async (params) => {
          return this.omnius.automation.triggerWebhook(params);
        }
      },
      {
        id: 'browser-screenshot',
        name: 'Take Screenshot',
        description: 'Capture website screenshot',
        category: 'web',
        execute: async (params) => {
          return this.omnius.browserPool.screenshot(params);
        }
      }
    ];

    for (const skill of omniumSkills) {
      this.skills.set(skill.id, skill);
    }

    logger.info(`✅ Loaded ${this.skills.size} skills`);
  }

  /**
   * Create new session
   */
  createSession(sessionId, userId, channelId) {
    const session = {
      id: sessionId,
      userId,
      channels: [channelId],
      messages: [],
      context: new Map(),
      metadata: {
        createdAt: Date.now(),
        lastActivityAt: Date.now()
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Enrich context with user profile and history
   */
  async enrichContext(userId, sessionId, session) {
    const context = {
      userId,
      sessionId,
      channels: session.channels,
      recentMessages: session.messages.slice(-10),
      userProfile: {},
      systemContext: {}
    };

    // Get user profile from OMNIUS
    try {
      const userProfile = await this.omnius.contextMemory.getUserProfile(userId);
      context.userProfile = userProfile;
    } catch (error) {
      logger.debug({ error }, 'Failed to load user profile');
    }

    return context;
  }

  /**
   * Detect and execute actions from response
   */
  async detectAndExecuteActions(response, userId, channelId) {
    const actions = [];

    // Simple detection: look for action patterns
    const emailPattern = /send.*email|email.*to|compose.*email/i;
    const calendarPattern = /schedule.*meeting|calendar.*event|book.*time/i;
    const taskPattern = /create.*task|add.*todo|task.*for/i;

    if (emailPattern.test(response)) {
      actions.push({
        type: 'email',
        status: 'ready',
        message: 'Email action detected'
      });
    }

    if (calendarPattern.test(response)) {
      actions.push({
        type: 'calendar',
        status: 'ready',
        message: 'Calendar action detected'
      });
    }

    if (taskPattern.test(response)) {
      actions.push({
        type: 'task',
        status: 'ready',
        message: 'Task action detected'
      });
    }

    return actions;
  }

  /**
   * Persist session to database
   */
  async persistSession(session) {
    try {
      // Store in OMNIUS database
      await this.omnius.db.run(
        `INSERT OR REPLACE INTO openclaw_sessions (id, user_id, data, updated_at) 
         VALUES (?, ?, ?, ?)`,
        [session.id, session.userId, JSON.stringify(session), new Date()]
      );
    } catch (error) {
      logger.error({ error }, 'Failed to persist session');
    }
  }

  /**
   * Send message to OpenClaw Gateway
   */
  sendGatewayMessage(type, data) {
    if (!this.connected) {
      logger.warn({ type }, 'Gateway not connected, queuing message');
      return;
    }

    try {
      this.gateway.send(JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to send gateway message');
    }
  }

  /**
   * Handle gateway errors
   */
  handleGatewayError(error) {
    logger.error({ error }, 'Gateway error');
    this.emit('gateway-error', error);
  }

  /**
   * Attempt to reconnect to gateway
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('gateway-failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectGateway().catch(error => {
        logger.error({ error }, 'Reconnection failed');
      });
    }, delay);
  }

  /**
   * Handle session creation
   */
  handleSessionCreated(data) {
    const { sessionId, userId, channelId } = data;
    logger.info({ sessionId, userId, channelId }, 'Session created');
    this.emit('session-created', data);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Close bridge
   */
  async close() {
    logger.info('Closing OpenClaw Bridge...');

    if (this.gateway) {
      this.gateway.close();
    }

    this.sessions.clear();
    this.agents.clear();
    this.skills.clear();

    logger.info('✅ OpenClaw Bridge closed');
  }
}

export default OpenClawBridge;
