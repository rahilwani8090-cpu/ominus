/**
 * Database Schema for OMNIUS AI Assistant
 * Real persistence layer with complete tables
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || path.join(__dirname, '../../data/omnius.db');

class DatabaseManager {
  constructor() {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  initialize() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        settings JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        model_used TEXT,
        tokens_used INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Automations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS automations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT,
        trigger_config JSON,
        actions JSON,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_run DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        automation_id TEXT,
        title TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        duration_ms INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE SET NULL
      )
    `);

    // Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT CHECK(level IN ('debug', 'info', 'warn', 'error')),
        message TEXT NOT NULL,
        context JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_timestamp (created_at)
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        encrypted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, key)
      )
    `);

    // Files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Voice history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS voice_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        confidence REAL,
        language TEXT,
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database initialized with all tables');
  }

  /**
   * Create a new user
   */
  createUser(email, name, passwordHash) {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, email, name, passwordHash);
    return id;
  }

  /**
   * Create a new conversation
   */
  createConversation(userId, title) {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, user_id, title)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, userId, title);
    return id;
  }

  /**
   * Add message to conversation
   */
  addMessage(conversationId, userId, role, content, model, tokens) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, user_id, role, content, model_used, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, conversationId, userId, role, content, model, tokens);
    return id;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(conversationId, limit).reverse();
  }

  /**
   * Create automation
   */
  createAutomation(userId, name, triggerType, triggerConfig, actions) {
    const id = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO automations (id, user_id, name, trigger_type, trigger_config, actions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      name,
      triggerType,
      JSON.stringify(triggerConfig),
      JSON.stringify(actions)
    );
    return id;
  }

  /**
   * Get all automations for user
   */
  getUserAutomations(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM automations
      WHERE user_id = ? AND enabled = 1
      ORDER BY created_at DESC
    `);
    const automations = stmt.all(userId);
    return automations.map(auto => ({
      ...auto,
      trigger_config: JSON.parse(auto.trigger_config),
      actions: JSON.parse(auto.actions)
    }));
  }

  /**
   * Log event
   */
  log(level, message, context = {}) {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO logs (id, level, message, context)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, level, message, JSON.stringify(context));
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM logs
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

export default new DatabaseManager();
