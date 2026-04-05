/**
 * Email Filtering Service - Smart AI-powered email categorization
 * Uses AI to categorize emails and generate smart responses
 * 
 * REAL filtering - uses actual AI analysis
 */

import AIModelRouter from '../models/AIModelRouter.js';
import GmailService from './GmailService.js';

class EmailFilteringService {
  constructor() {
    this.categories = [
      'work',
      'personal',
      'financial',
      'promotion',
      'newsletter',
      'social',
      'notification',
      'spam'
    ];

    this.rules = [
      {
        name: 'Promotion',
        keywords: ['discount', 'sale', '50% off', 'limited time', 'offer'],
        label: 'promotion'
      },
      {
        name: 'Newsletter',
        keywords: ['unsubscribe', 'newsletter', 'weekly digest', 'monthly update'],
        label: 'newsletter'
      },
      {
        name: 'Financial',
        keywords: ['invoice', 'receipt', 'payment', 'billing', 'subscription'],
        label: 'financial'
      },
      {
        name: 'Social',
        keywords: ['commented', 'liked', 'shared', 'mentioned', 'friend request'],
        label: 'social'
      }
    ];
  }

  /**
   * Analyze and categorize email using AI
   * REAL - Uses AI model
   */
  async categorizeEmail(email) {
    try {
      const { from, subject, body } = email;
      const emailContent = `From: ${from}\nSubject: ${subject}\nBody: ${body.substring(0, 500)}`;

      // Use AI to categorize
      const prompt = `Categorize this email into ONE of these categories: ${this.categories.join(', ')}

Email:
${emailContent}

Respond with ONLY the category name (e.g., "work", "promotion", "spam").`;

      const response = await AIModelRouter.route(prompt, {
        taskType: 'classification',
        temperature: 0.3, // Low temp for consistent categorization
        maxTokens: 10
      });

      const category = response.response.toLowerCase().trim();
      const isValid = this.categories.includes(category);

      return {
        email,
        category: isValid ? category : 'personal',
        confidence: 0.85,
        model: response.model
      };
    } catch (error) {
      console.error(`Categorization failed: ${error.message}`);
      return {
        email,
        category: 'personal',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Apply rule-based filtering
   * Fast, no AI needed
   */
  applyRuleBasedFiltering(email) {
    const { subject, body, from } = email;
    const emailText = `${from} ${subject} ${body}`.toLowerCase();

    for (const rule of this.rules) {
      if (rule.keywords.some(keyword => emailText.includes(keyword.toLowerCase()))) {
        return {
          email,
          category: rule.label,
          method: 'rule-based',
          matchedRule: rule.name
        };
      }
    }

    return null;
  }

  /**
   * Batch categorize multiple emails
   */
  async batchCategorizeEmails(emails) {
    const results = [];

    for (const email of emails) {
      // Try rule-based first (fast)
      let result = this.applyRuleBasedFiltering(email);

      // If no rule matched, use AI
      if (!result) {
        result = await this.categorizeEmail(email);
      }

      results.push(result);
    }

    return {
      total: emails.length,
      categorized: results.length,
      categories: this.getCategorySummary(results),
      emails: results
    };
  }

  /**
   * Get categorization summary
   */
  getCategorySummary(results) {
    const summary = {};
    for (const category of this.categories) {
      summary[category] = results.filter(r => r.category === category).length;
    }
    return summary;
  }

  /**
   * Generate smart response to email
   * Uses AI to craft appropriate replies
   */
  async generateSmartResponse(email) {
    try {
      const { from, subject, body } = email;

      // Categorize first
      const categorized = await this.categorizeEmail(email);
      const category = categorized.category;

      // Generate appropriate response based on category
      let responsePrompt = '';

      switch (category) {
        case 'promotion':
          responsePrompt = `Generate a polite "unsubscribe" email response to: ${subject}`;
          break;
        case 'newsletter':
          responsePrompt = `Generate a brief acknowledgment of newsletter receipt to: ${subject}`;
          break;
        case 'work':
          responsePrompt = `Generate a professional response to a work email with subject "${subject}". Keep it brief and actionable.`;
          break;
        case 'financial':
          responsePrompt = `Generate a brief confirmation response to a financial email with subject "${subject}"`;
          break;
        case 'spam':
          responsePrompt = 'Do not respond to this email - it is spam. Return: "NO_RESPONSE_SPAM"';
          break;
        default:
          responsePrompt = `Generate a friendly, brief response to an email with subject "${subject}"`;
      }

      const response = await AIModelRouter.route(responsePrompt, {
        taskType: 'writing',
        temperature: 0.5,
        maxTokens: 200
      });

      return {
        from,
        subject: `Re: ${subject}`,
        body: response.response,
        category,
        recommended: category !== 'spam'
      };
    } catch (error) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Apply filtering automation
   * Reads emails, categorizes, applies labels, generates responses
   */
  async applyFilteringAutomation(userId, rules = {}) {
    try {
      const {
        autoRespond = false,
        autoLabel = true,
        autoArchive = false,
        excludeCategories = ['work'] // Don't auto-respond to work
      } = rules;

      // Get unread emails
      const emailsResult = await GmailService.getEmails(20, 'is:unread');
      const emails = emailsResult.emails;

      if (emails.length === 0) {
        return { processed: 0, results: [] };
      }

      // Categorize all emails
      const categorized = await this.batchCategorizeEmails(emails);
      const results = [];

      // Apply actions based on category
      for (const item of categorized.emails) {
        const { email, category } = item;
        const actions = [];

        // Apply label
        if (autoLabel) {
          try {
            await GmailService.applyLabel(email.id, category);
            actions.push(`labeled:${category}`);
          } catch (e) {
            console.warn(`Failed to label: ${e.message}`);
          }
        }

        // Auto-respond (if enabled and not excluded)
        if (autoRespond && !excludeCategories.includes(category)) {
          try {
            const response = await this.generateSmartResponse(email);
            if (response.recommended) {
              await GmailService.sendEmail(
                email.from,
                response.subject,
                response.body,
                { isHtml: false }
              );
              actions.push('responded');
            }
          } catch (e) {
            console.warn(`Failed to respond: ${e.message}`);
          }
        }

        // Archive if specified
        if (autoArchive && category !== 'work') {
          try {
            await GmailService.archiveEmail(email.id);
            actions.push('archived');
          } catch (e) {
            console.warn(`Failed to archive: ${e.message}`);
          }
        }

        results.push({
          messageId: email.id,
          category,
          actions
        });
      }

      return {
        processed: results.length,
        summary: categorized.categories,
        results
      };
    } catch (error) {
      throw new Error(`Filtering automation failed: ${error.message}`);
    }
  }

  /**
   * Create custom filtering rules
   */
  async createCustomRule(name, keywords, label) {
    const rule = {
      name,
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      label
    };

    this.rules.push(rule);

    return {
      success: true,
      rule,
      totalRules: this.rules.length
    };
  }

  /**
   * Get filtering statistics
   */
  async getFilteringStats(emailResults) {
    const stats = {
      total: emailResults.length,
      byCategory: this.getCategorySummary(emailResults),
      spamCount: emailResults.filter(e => e.category === 'spam').length,
      promotionCount: emailResults.filter(e => e.category === 'promotion').length,
      workCount: emailResults.filter(e => e.category === 'work').length
    };

    stats.spamPercentage = ((stats.spamCount / stats.total) * 100).toFixed(1);
    stats.workPercentage = ((stats.workCount / stats.total) * 100).toFixed(1);

    return stats;
  }

  /**
   * Priority inbox - show important emails first
   * Uses AI to determine importance
   */
  async prioritizeEmails(emails) {
    try {
      const prioritized = [];

      for (const email of emails) {
        const prompt = `Rate the importance of this email on a scale of 1-5 (1=low, 5=urgent):
        
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body.substring(0, 200)}

Respond with ONLY a number 1-5.`;

        const response = await AIModelRouter.route(prompt, {
          taskType: 'classification',
          temperature: 0.3,
          maxTokens: 5
        });

        const priority = parseInt(response.response.trim());

        prioritized.push({
          ...email,
          priority: priority || 3
        });
      }

      // Sort by priority (highest first)
      return prioritized.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error(`Prioritization failed: ${error.message}`);
      return emails;
    }
  }

  /**
   * Email digest - summarize multiple emails
   */
  async createEmailDigest(emails, maxLength = 1000) {
    try {
      const emailSummaries = emails.slice(0, 10).map(e => `
From: ${e.from}
Subject: ${e.subject}
Body: ${e.body.substring(0, 150)}
      `).join('\n---\n');

      const prompt = `Create a brief executive summary of these ${emails.length} emails (max ${maxLength} chars):

${emailSummaries}

Highlight action items and urgent messages.`;

      const response = await AIModelRouter.route(prompt, {
        taskType: 'summarization',
        maxTokens: 500
      });

      return {
        totalEmails: emails.length,
        summary: response.response,
        model: response.model
      };
    } catch (error) {
      throw new Error(`Digest creation failed: ${error.message}`);
    }
  }
}

export default new EmailFilteringService();
