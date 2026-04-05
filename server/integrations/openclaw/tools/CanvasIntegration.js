/**
 * Canvas Integration Module
 * Real-time visual workspace with A2UI protocol
 * Interactive elements, dashboards, live updates
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'CanvasIntegration' });

export class CanvasIntegration {
  constructor(omniumServer, config = {}) {
    this.omnius = omniumServer;
    this.config = {
      maxCanvases: config.maxCanvases || 100,
      updateInterval: config.updateInterval || 500,
      ...config
    };

    this.canvases = new Map();
    this.subscribers = new Map();
  }

  /**
   * Initialize canvas integration
   */
  async initialize() {
    logger.info('Initializing Canvas Integration...');
    logger.info('✅ Canvas Integration initialized');
    return true;
  }

  /**
   * Create new canvas
   */
  createCanvas(userId, options = {}) {
    const {
      title = 'Workspace',
      type = 'workflow',
      theme = 'light'
    } = options;

    const canvasId = uuidv4();

    const canvas = {
      id: canvasId,
      userId,
      title,
      type,
      theme,
      elements: [],
      layout: {
        width: 1200,
        height: 800,
        grid: true,
        zoom: 1
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      },
      state: new Map()
    };

    this.canvases.set(canvasId, canvas);
    logger.info({ canvasId, userId }, '✅ Canvas created');

    return canvas;
  }

  /**
   * Add element to canvas
   */
  addElement(canvasId, element) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    const elementId = element.id || uuidv4();
    const fullElement = {
      id: elementId,
      type: element.type, // 'button', 'input', 'text', 'image', 'table', etc.
      label: element.label || '',
      value: element.value || null,
      position: element.position || { x: 0, y: 0 },
      size: element.size || { width: 100, height: 50 },
      style: element.style || {},
      actions: element.actions || [],
      ...element
    };

    canvas.elements.push(fullElement);
    canvas.metadata.updatedAt = Date.now();

    this.notifySubscribers(canvasId, {
      type: 'element_added',
      element: fullElement
    });

    logger.info({ canvasId, elementId }, 'Element added to canvas');
    return fullElement;
  }

  /**
   * Update element on canvas
   */
  updateElement(canvasId, elementId, updates) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    const element = canvas.elements.find(e => e.id === elementId);
    if (!element) {
      throw new Error(`Element not found: ${elementId}`);
    }

    Object.assign(element, updates);
    canvas.metadata.updatedAt = Date.now();

    this.notifySubscribers(canvasId, {
      type: 'element_updated',
      elementId,
      updates
    });

    logger.info({ canvasId, elementId }, 'Element updated');
    return element;
  }

  /**
   * Remove element from canvas
   */
  removeElement(canvasId, elementId) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    const index = canvas.elements.findIndex(e => e.id === elementId);
    if (index === -1) {
      throw new Error(`Element not found: ${elementId}`);
    }

    const element = canvas.elements.splice(index, 1)[0];
    canvas.metadata.updatedAt = Date.now();

    this.notifySubscribers(canvasId, {
      type: 'element_removed',
      elementId
    });

    logger.info({ canvasId, elementId }, 'Element removed from canvas');
    return element;
  }

  /**
   * Render canvas to A2UI format
   */
  renderCanvas(canvasId) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    // A2UI protocol rendering
    const a2ui = {
      version: '1.0',
      canvas: {
        id: canvas.id,
        title: canvas.title,
        theme: canvas.theme,
        layout: canvas.layout,
        elements: canvas.elements.map(el => ({
          id: el.id,
          type: el.type,
          label: el.label,
          value: el.value,
          position: el.position,
          size: el.size,
          style: el.style,
          actions: el.actions
        }))
      },
      metadata: {
        createdAt: canvas.metadata.createdAt,
        updatedAt: canvas.metadata.updatedAt,
        version: canvas.metadata.version
      }
    };

    return a2ui;
  }

  /**
   * Create workflow canvas (common use case)
   */
  createWorkflowCanvas(userId, workflow = {}) {
    const canvas = this.createCanvas(userId, {
      title: workflow.name || 'Workflow',
      type: 'workflow',
      theme: 'dark'
    });

    // Add workflow status
    this.addElement(canvas.id, {
      type: 'text',
      label: `Workflow: ${workflow.name || 'New Workflow'}`,
      position: { x: 20, y: 20 },
      size: { width: 300, height: 50 },
      style: { fontSize: 18, fontWeight: 'bold' }
    });

    // Add status boxes
    const tasks = workflow.tasks || [];
    tasks.forEach((task, index) => {
      this.addElement(canvas.id, {
        type: 'button',
        label: task.name || `Task ${index + 1}`,
        value: task.status || 'pending',
        position: { x: 20 + (index * 150), y: 100 },
        size: { width: 130, height: 60 },
        style: {
          background: this.getTaskColor(task.status),
          color: 'white',
          borderRadius: '4px'
        }
      });
    });

    return canvas;
  }

  /**
   * Create data table canvas
   */
  createTableCanvas(userId, data = {}) {
    const canvas = this.createCanvas(userId, {
      title: data.title || 'Data Table',
      type: 'table',
      theme: 'light'
    });

    // Add table
    this.addElement(canvas.id, {
      type: 'table',
      label: data.title || 'Table',
      value: data.rows || [],
      position: { x: 20, y: 20 },
      size: { width: 1160, height: 700 },
      style: {
        columns: data.columns || [],
        striped: true,
        hoverable: true
      }
    });

    return canvas;
  }

  /**
   * Create dashboard canvas
   */
  createDashboardCanvas(userId, dashboardConfig = {}) {
    const canvas = this.createCanvas(userId, {
      title: dashboardConfig.title || 'Dashboard',
      type: 'dashboard',
      theme: dashboardConfig.theme || 'dark'
    });

    // Add metrics
    const metrics = dashboardConfig.metrics || [];
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;

      this.addElement(canvas.id, {
        type: 'metric',
        label: metric.label || 'Metric',
        value: metric.value || 0,
        position: { x: 20 + (col * 380), y: 20 + (row * 200) },
        size: { width: 360, height: 180 },
        style: {
          fontSize: 24,
          color: metric.color || '#00ff00'
        }
      });
    });

    return canvas;
  }

  /**
   * Update canvas state
   */
  updateCanvasState(canvasId, key, value) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    canvas.state.set(key, value);
    canvas.metadata.updatedAt = Date.now();

    this.notifySubscribers(canvasId, {
      type: 'state_updated',
      key,
      value
    });

    return canvas.state.get(key);
  }

  /**
   * Get canvas state
   */
  getCanvasState(canvasId, key) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      return null;
    }

    return key ? canvas.state.get(key) : Object.fromEntries(canvas.state);
  }

  /**
   * Subscribe to canvas updates
   */
  subscribeToCanvas(canvasId, callback) {
    if (!this.subscribers.has(canvasId)) {
      this.subscribers.set(canvasId, []);
    }

    this.subscribers.get(canvasId).push(callback);
    logger.info({ canvasId }, 'New subscriber');

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(canvasId);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of changes
   */
  notifySubscribers(canvasId, message) {
    const callbacks = this.subscribers.get(canvasId);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.error({ error }, 'Subscriber callback error');
      }
    });
  }

  /**
   * Get task color based on status
   */
  getTaskColor(status) {
    const colors = {
      pending: '#FFB84D',
      running: '#00D4FF',
      completed: '#00FF00',
      failed: '#FF0000',
      skipped: '#888888'
    };

    return colors[status] || '#888888';
  }

  /**
   * Get canvas by ID
   */
  getCanvas(canvasId) {
    return this.canvases.get(canvasId);
  }

  /**
   * Get all canvases for user
   */
  getUserCanvases(userId) {
    return Array.from(this.canvases.values()).filter(c => c.userId === userId);
  }

  /**
   * Delete canvas
   */
  deleteCanvas(canvasId) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    this.canvases.delete(canvasId);
    this.subscribers.delete(canvasId);

    logger.info({ canvasId }, 'Canvas deleted');
    return true;
  }

  /**
   * Export canvas as JSON
   */
  exportCanvas(canvasId) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    return {
      id: canvas.id,
      userId: canvas.userId,
      title: canvas.title,
      type: canvas.type,
      theme: canvas.theme,
      layout: canvas.layout,
      elements: canvas.elements,
      state: Object.fromEntries(canvas.state),
      metadata: canvas.metadata
    };
  }

  /**
   * Import canvas from JSON
   */
  importCanvas(userId, data) {
    const canvas = {
      id: data.id || uuidv4(),
      userId,
      title: data.title,
      type: data.type,
      theme: data.theme,
      layout: data.layout,
      elements: data.elements || [],
      metadata: data.metadata || {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      },
      state: new Map(Object.entries(data.state || {}))
    };

    this.canvases.set(canvas.id, canvas);
    logger.info({ canvasId: canvas.id, userId }, 'Canvas imported');

    return canvas;
  }

  /**
   * Clear all canvases
   */
  clear() {
    this.canvases.clear();
    this.subscribers.clear();
    logger.info('All canvases cleared');
  }
}

export default CanvasIntegration;
