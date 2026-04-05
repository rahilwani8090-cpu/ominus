/**
 * Skills Manager
 * Manages OpenClaw skills marketplace integration
 * 5,400+ skills support + OMNIUS automations export
 */

import pino from 'pino';

const logger = pino({ name: 'SkillsManager' });

export class SkillsManager {
  constructor(omniumServer, config = {}) {
    this.omnius = omniumServer;
    this.config = config;
    this.skills = new Map();
    this.categories = new Map();
    this.userInstalls = new Map();
  }

  /**
   * Initialize skills manager
   */
  async initialize() {
    logger.info('Initializing Skills Manager...');

    // Load built-in OMNIUS skills
    this.loadOmniusSkills();

    // Load marketplace skills
    await this.loadMarketplaceSkills();

    logger.info(`✅ Skills Manager initialized with ${this.skills.size} skills`);
    return true;
  }

  /**
   * Load built-in OMNIUS skills
   */
  loadOmniusSkills() {
    const omniumSkills = [
      {
        id: 'omnius-email-send',
        name: 'Send Email',
        description: 'Send email via Gmail with full formatting support',
        category: 'communication',
        icon: '📧',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          to: { type: 'string', required: true },
          subject: { type: 'string', required: true },
          body: { type: 'string', required: true },
          cc: { type: 'array', required: false },
          bcc: { type: 'array', required: false },
          attachments: { type: 'array', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.automation.sendEmail(params);
        }
      },
      {
        id: 'omnius-calendar-create',
        name: 'Create Calendar Event',
        description: 'Create event in Google Calendar',
        category: 'calendar',
        icon: '📅',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          title: { type: 'string', required: true },
          startTime: { type: 'string', required: true },
          endTime: { type: 'string', required: true },
          description: { type: 'string', required: false },
          attendees: { type: 'array', required: false },
          location: { type: 'string', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.automation.createCalendarEvent(params);
        }
      },
      {
        id: 'omnius-task-create',
        name: 'Create Task',
        description: 'Create task in task manager',
        category: 'productivity',
        icon: '✅',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          title: { type: 'string', required: true },
          description: { type: 'string', required: false },
          dueDate: { type: 'string', required: false },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        execute: async (params, context) => {
          return this.omnius.automation.createTask(params);
        }
      },
      {
        id: 'omnius-web-scrape',
        name: 'Scrape Website',
        description: 'Scrape content from website with CSS selectors',
        category: 'web',
        icon: '🕷️',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          url: { type: 'string', required: true },
          selectors: { type: 'object', required: false },
          waitForSelector: { type: 'string', required: false },
          timeout: { type: 'number', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.automation.scrapeWebsite(params);
        }
      },
      {
        id: 'omnius-email-schedule',
        name: 'Schedule Email',
        description: 'Schedule email to send at specific time',
        category: 'communication',
        icon: '⏰',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          to: { type: 'string', required: true },
          subject: { type: 'string', required: true },
          body: { type: 'string', required: true },
          sendAt: { type: 'string', required: true }
        },
        execute: async (params, context) => {
          return this.omnius.automation.scheduleEmail(params);
        }
      },
      {
        id: 'omnius-email-filter',
        name: 'Filter Emails',
        description: 'Apply filters to Gmail inbox',
        category: 'email',
        icon: '🔍',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          query: { type: 'string', required: true },
          action: { type: 'string', enum: ['archive', 'delete', 'label', 'star'] },
          labelName: { type: 'string', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.automation.filterEmails(params);
        }
      },
      {
        id: 'omnius-webhook-trigger',
        name: 'Trigger Webhook',
        description: 'Send data to webhook endpoint',
        category: 'integration',
        icon: '🔗',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          url: { type: 'string', required: true },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          headers: { type: 'object', required: false },
          body: { type: 'object', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.automation.triggerWebhook(params);
        }
      },
      {
        id: 'omnius-browser-screenshot',
        name: 'Take Screenshot',
        description: 'Capture website screenshot',
        category: 'web',
        icon: '📸',
        version: '1.0.0',
        author: 'OMNIUS',
        verified: true,
        params: {
          url: { type: 'string', required: true },
          fullPage: { type: 'boolean', required: false },
          width: { type: 'number', required: false },
          height: { type: 'number', required: false }
        },
        execute: async (params, context) => {
          return this.omnius.browserPool.screenshot(params);
        }
      }
    ];

    omniumSkills.forEach(skill => {
      this.registerSkill(skill);
      this.addToCategory(skill.category, skill.id);
    });

    logger.info(`✅ Loaded ${omniumSkills.length} OMNIUS skills`);
  }

  /**
   * Load marketplace skills (mock for now)
   */
  async loadMarketplaceSkills() {
    logger.info('Loading marketplace skills...');

    // In production, this would fetch from clawhub.ai API
    // For now, we'll create mock marketplace skills

    const categories = [
      'communication',
      'productivity',
      'web',
      'integration',
      'calendar',
      'email',
      'social',
      'finance',
      'analytics',
      'developer'
    ];

    // Create mock skills (in real impl, would be 5,400+ from API)
    let skillCount = 0;
    for (const category of categories) {
      for (let i = 1; i <= 50; i++) {
        const skillId = `skill-${category}-${i}`;
        const skill = {
          id: skillId,
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Skill ${i}`,
          description: `Marketplace skill for ${category}`,
          category,
          icon: '⚡',
          version: '1.0.0',
          author: 'Community',
          verified: Math.random() > 0.3,
          downloads: Math.floor(Math.random() * 10000),
          rating: (Math.random() * 5).toFixed(1),
          params: {
            input: { type: 'string', required: true }
          },
          execute: async (params, context) => {
            return {
              success: true,
              result: `Result from ${skillId}`,
              params
            };
          }
        };

        this.registerSkill(skill);
        this.addToCategory(category, skillId);
        skillCount++;
      }
    }

    logger.info(`✅ Loaded ${skillCount} marketplace skills`);
  }

  /**
   * Register a skill
   */
  registerSkill(skill) {
    if (!skill.id || !skill.name || !skill.execute) {
      throw new Error('Skill must have id, name, and execute function');
    }

    this.skills.set(skill.id, skill);
    logger.debug({ skillId: skill.id }, 'Skill registered');
  }

  /**
   * Add skill to category
   */
  addToCategory(category, skillId) {
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(skillId);
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId) {
    return this.skills.get(skillId);
  }

  /**
   * Search skills
   */
  searchSkills(query, category = null) {
    const results = Array.from(this.skills.values()).filter(skill => {
      const matchesQuery = skill.name.toLowerCase().includes(query.toLowerCase()) ||
                          skill.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || skill.category === category;
      return matchesQuery && matchesCategory;
    });

    return results.sort((a, b) => {
      // Sort by verification, then rating, then downloads
      if (a.verified !== b.verified) return b.verified ? 1 : -1;
      if (a.rating !== b.rating) return parseFloat(b.rating) - parseFloat(a.rating);
      return (b.downloads || 0) - (a.downloads || 0);
    });
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category) {
    const skillIds = this.categories.get(category) || [];
    return skillIds.map(id => this.skills.get(id)).filter(Boolean);
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys()).sort();
  }

  /**
   * Install skill for user
   */
  installSkill(userId, skillId) {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    if (!this.userInstalls.has(userId)) {
      this.userInstalls.set(userId, new Set());
    }

    this.userInstalls.get(userId).add(skillId);
    logger.info({ userId, skillId }, 'Skill installed');

    return {
      success: true,
      skillId,
      skill
    };
  }

  /**
   * Uninstall skill for user
   */
  uninstallSkill(userId, skillId) {
    if (!this.userInstalls.has(userId)) {
      throw new Error('User has no installed skills');
    }

    this.userInstalls.get(userId).delete(skillId);
    logger.info({ userId, skillId }, 'Skill uninstalled');

    return { success: true, skillId };
  }

  /**
   * Get user's installed skills
   */
  getUserSkills(userId) {
    const skillIds = this.userInstalls.get(userId) || new Set();
    return Array.from(skillIds)
      .map(id => this.skills.get(id))
      .filter(Boolean);
  }

  /**
   * Execute skill
   */
  async executeSkill(skillId, params, context = {}) {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    try {
      logger.info({ skillId, params: JSON.stringify(params).substring(0, 100) }, 'Executing skill');

      const result = await skill.execute(params, context);

      logger.info({ skillId, result: JSON.stringify(result).substring(0, 100) }, 'Skill executed');

      return {
        success: true,
        skillId,
        result
      };
    } catch (error) {
      logger.error({ error, skillId }, 'Skill execution failed');

      return {
        success: false,
        skillId,
        error: error.message
      };
    }
  }

  /**
   * Get skill stats
   */
  getStats() {
    const allSkills = Array.from(this.skills.values());
    const totalSkills = allSkills.length;
    const verifiedSkills = allSkills.filter(s => s.verified).length;
    const totalInstalls = Array.from(this.userInstalls.values()).reduce((sum, set) => sum + set.size, 0);

    return {
      totalSkills,
      verifiedSkills,
      categories: this.getCategories(),
      totalInstalls,
      avgRating: (allSkills.reduce((sum, s) => sum + parseFloat(s.rating || 0), 0) / totalSkills).toFixed(1)
    };
  }
}

export default SkillsManager;
