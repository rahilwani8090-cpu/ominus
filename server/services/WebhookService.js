/**
 * Webhook Service - Real webhook system for external integrations
 * Register endpoints, handle callbacks, trigger automations
 * 
 * REAL webhooks - actual event processing
 */

import crypto from 'crypto';
import axios from 'axios';

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.history = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Register webhook endpoint
   * Each webhook gets unique URL
   */
  async registerWebhook(userId, name, targetUrl, events, options = {}) {
    try {
      const webhookId = crypto.randomBytes(16).toString('hex');
      const secret = crypto.randomBytes(32).toString('hex');

      const {
        retryPolicy = { maxRetries: 3, backoffMultiplier: 2 },
        timeout = 30000,
        active = true,
        headers = {}
      } = options;

      const webhook = {
        id: webhookId,
        userId,
        name,
        targetUrl,
        events: Array.isArray(events) ? events : [events],
        secret,
        active,
        retryPolicy,
        timeout,
        headers,
        createdAt: new Date(),
        lastTriggered: null,
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0
      };

      this.webhooks.set(webhookId, webhook);

      console.log(`✅ Webhook registered: ${name} (${webhookId})`);

      return {
        webhookId,
        secret,
        endpoint: `/webhooks/${webhookId}/trigger`,
        status: 'active'
      };
    } catch (error) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }

  /**
   * Trigger webhook
   * Send event data to target URL
   */
  async triggerWebhook(webhookId, eventType, data = {}) {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    if (!webhook.active) {
      throw new Error(`Webhook is inactive: ${webhookId}`);
    }

    // Check if webhook is interested in this event
    if (!webhook.events.includes('*') && !webhook.events.includes(eventType)) {
      return { skipped: true, reason: 'Event not subscribed' };
    }

    try {
      // Create signed payload
      const payload = {
        webhookId,
        eventType,
        timestamp: new Date().toISOString(),
        data
      };

      const signature = this.createSignature(JSON.stringify(payload), webhook.secret);

      // Send webhook with retry
      const result = await this.sendWebhookWithRetry(webhook, payload, signature);

      // Update stats
      webhook.totalCalls++;
      webhook.lastTriggered = new Date();

      if (result.success) {
        webhook.successCalls++;
      } else {
        webhook.failedCalls++;
      }

      // Log to history
      this.addToHistory({
        webhookId,
        eventType,
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      webhook.failedCalls++;

      this.addToHistory({
        webhookId,
        eventType,
        success: false,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Send webhook with retry logic
   */
  async sendWebhookWithRetry(webhook, payload, signature) {
    const { maxRetries, backoffMultiplier } = webhook.retryPolicy;
    let delay = 1000;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(webhook.targetUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': webhook.id,
            ...webhook.headers
          },
          timeout: webhook.timeout,
          validateStatus: () => true
        });

        return {
          success: response.status >= 200 && response.status < 300,
          statusCode: response.status,
          response: response.data,
          attempts: attempt
        };
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          console.log(`⏳ Webhook retry in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= backoffMultiplier;
        }
      }
    }

    return {
      success: false,
      statusCode: 0,
      error: lastError.message,
      attempts: maxRetries
    };
  }

  /**
   * Create HMAC signature for payload
   * Allows target to verify authenticity
   */
  createSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * Target should verify before processing
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    // Update allowed fields
    const allowedFields = ['name', 'targetUrl', 'events', 'active', 'headers'];
    for (const field of allowedFields) {
      if (field in updates) {
        webhook[field] = updates[field];
      }
    }

    webhook.updatedAt = new Date();

    return { success: true, webhook };
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    this.webhooks.delete(webhookId);
    return { success: true, deleted: webhookId };
  }

  /**
   * Get webhook details
   */
  getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    // Don't expose secret in details
    const { secret, ...safeWebhook } = webhook;
    return safeWebhook;
  }

  /**
   * List user's webhooks
   */
  getUserWebhooks(userId) {
    const userWebhooks = [];

    for (const [id, webhook] of this.webhooks) {
      if (webhook.userId === userId) {
        const { secret, ...safeWebhook } = webhook;
        userWebhooks.push(safeWebhook);
      }
    }

    return userWebhooks;
  }

  /**
   * Get webhook history/logs
   */
  getWebhookHistory(webhookId, limit = 50) {
    const webhookHistory = this.history
      .filter(h => h.webhookId === webhookId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return webhookHistory;
  }

  /**
   * Add to history
   */
  addToHistory(entry) {
    this.history.push(entry);

    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    const successRate =
      webhook.totalCalls > 0
        ? ((webhook.successCalls / webhook.totalCalls) * 100).toFixed(1)
        : 0;

    return {
      webhookId,
      name: webhook.name,
      totalCalls: webhook.totalCalls,
      successCalls: webhook.successCalls,
      failedCalls: webhook.failedCalls,
      successRate: `${successRate}%`,
      lastTriggered: webhook.lastTriggered,
      active: webhook.active
    };
  }

  /**
   * Batch trigger webhooks for event
   * Trigger all webhooks interested in an event
   */
  async broadcastEvent(eventType, data = {}) {
    const results = [];

    for (const [webhookId, webhook] of this.webhooks) {
      try {
        const result = await this.triggerWebhook(webhookId, eventType, data);
        results.push({
          webhookId,
          success: result.success,
          statusCode: result.statusCode
        });
      } catch (error) {
        results.push({
          webhookId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      eventType,
      totalWebhooks: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Test webhook
   * Send test data to verify webhook works
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const testData = {
      test: true,
      message: 'This is a test webhook event'
    };

    try {
      const result = await this.triggerWebhook(webhookId, 'test', testData);
      return {
        success: result.success,
        statusCode: result.statusCode,
        response: result.response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all webhooks statistics
   */
  getAllStats() {
    const stats = {
      totalWebhooks: this.webhooks.size,
      totalEvents: this.history.length,
      webhooks: []
    };

    for (const [webhookId, webhook] of this.webhooks) {
      stats.webhooks.push({
        id: webhookId,
        name: webhook.name,
        active: webhook.active,
        calls: webhook.totalCalls,
        successRate: webhook.totalCalls > 0
          ? ((webhook.successCalls / webhook.totalCalls) * 100).toFixed(1)
          : 0
      });
    }

    return stats;
  }
}

export default new WebhookService();
