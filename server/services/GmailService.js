/**
 * Gmail Service - Real email automation
 * Uses Google Gmail API for actual email operations
 * 
 * REAL Gmail integration - not fake
 */

import { google } from 'googleapis';
import base64url from 'base64-url';
import nodemailer from 'nodemailer';

class GmailService {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.initializeGmail();
  }

  /**
   * Initialize Gmail API with OAuth2
   */
  async initializeGmail() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // If you have a refresh token stored
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
      }

      this.auth = oauth2Client;
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log('✅ Gmail API initialized');
    } catch (error) {
      console.warn('⚠️  Gmail API initialization deferred:', error.message);
    }
  }

  /**
   * Get OAuth2 authorization URL (for user login)
   */
  getAuthorizationUrl() {
    if (!this.auth) {
      throw new Error('Gmail API not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      return {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiresIn: tokens.expiry_date
      };
    } catch (error) {
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
  }

  /**
   * Send email via Gmail API (REAL)
   */
  async sendEmail(to, subject, body, options = {}) {
    if (!this.gmail) {
      throw new Error('Gmail API not configured');
    }

    try {
      const {
        from = process.env.GMAIL_USER,
        cc = [],
        bcc = [],
        attachments = [],
        isHtml = true
      } = options;

      // Create email message
      const message = {
        raw: await this.createRawMessage(
          from,
          to,
          cc,
          bcc,
          subject,
          body,
          isHtml,
          attachments
        )
      };

      // Send via Gmail API
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: message
      });

      return {
        type: 'email-sent',
        messageId: result.data.id,
        threadId: result.data.threadId,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Create raw email message (RFC 2822 format)
   */
  async createRawMessage(from, to, cc, bcc, subject, body, isHtml, attachments) {
    let message = [
      `From: ${from}`,
      `To: ${to}`,
      cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
      bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      body
    ]
      .filter(line => line !== '')
      .join('\n');

    return base64url.escape(Buffer.from(message).toString('base64'));
  }

  /**
   * Read emails from inbox (REAL)
   */
  async getEmails(maxResults = 10, query = '') {
    if (!this.gmail) {
      throw new Error('Gmail API not configured');
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query
      });

      if (!response.data.messages) {
        return { emails: [], total: 0 };
      }

      // Get full details of each message
      const emails = await Promise.all(
        response.data.messages.map(msg => this.getMessageDetails(msg.id))
      );

      return {
        emails,
        total: response.data.resultSizeEstimate
      };
    } catch (error) {
      throw new Error(`Failed to get emails: ${error.message}`);
    }
  }

  /**
   * Get full message details
   */
  async getMessageDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;
      const getHeader = (name) => headers.find(h => h.name === name)?.value;

      // Extract body
      let body = '';
      if (message.payload.parts) {
        const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      } else if (message.payload.body && message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      }

      return {
        id: messageId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        body: body.substring(0, 500),
        date: getHeader('Date'),
        labels: message.labelIds || [],
        threadId: message.threadId
      };
    } catch (error) {
      console.error(`Failed to get message details: ${error.message}`);
      return null;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to mark as read: ${error.message}`);
    }
  }

  /**
   * Archive email (remove from inbox)
   */
  async archiveEmail(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX']
        }
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to archive: ${error.message}`);
    }
  }

  /**
   * Delete email
   */
  async deleteEmail(messageId) {
    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  /**
   * Apply label to email
   */
  async applyLabel(messageId, labelName) {
    try {
      // Get label ID
      const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
      const label = labelsResponse.data.labels.find(l => l.name === labelName);

      if (!label) {
        throw new Error(`Label not found: ${labelName}`);
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id]
        }
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to apply label: ${error.message}`);
    }
  }

  /**
   * Search emails with advanced queries
   */
  async searchEmails(query, maxResults = 20) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const emails = await Promise.all(
        (response.data.messages || []).map(msg => this.getMessageDetails(msg.id))
      );

      return {
        query,
        results: emails.filter(e => e !== null),
        total: response.data.resultSizeEstimate
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get unread emails count
   */
  async getUnreadCount() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread'
      });

      return response.data.resultSizeEstimate || 0;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  /**
   * Get email labels
   */
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' });
      return response.data.labels || [];
    } catch (error) {
      throw new Error(`Failed to get labels: ${error.message}`);
    }
  }

  /**
   * Create custom label
   */
  async createLabel(name) {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });

      return {
        id: response.data.id,
        name: response.data.name
      };
    } catch (error) {
      throw new Error(`Failed to create label: ${error.message}`);
    }
  }

  /**
   * Auto-reply setup
   */
  async setupAutoReply(message, startTime, endTime) {
    try {
      // This would typically be done via Gmail Settings API
      // For now, return guidance
      return {
        status: 'requires-manual-setup',
        message: 'Auto-reply should be set via Gmail settings or use filters + AI response',
        suggestion: 'Use email filters + AI-generated responses'
      };
    } catch (error) {
      throw new Error(`Auto-reply setup failed: ${error.message}`);
    }
  }

  /**
   * Get email statistics
   */
  async getStats() {
    try {
      const unread = await this.getUnreadCount();
      const totalResponse = await this.gmail.users.messages.list({
        userId: 'me'
      });

      return {
        total: totalResponse.data.resultSizeEstimate || 0,
        unread,
        labels: (await this.getLabels()).length
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

export default new GmailService();
