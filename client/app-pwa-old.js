/**
 * OMNIUS Frontend - Phase 3 PWA
 * Real-time WebSocket, voice UI, workflow builder
 * Mobile-first responsive design
 */

class OMNIUSApp {
  constructor() {
    this.socket = null;
    this.isOnline = navigator.onLine;
    this.conversations = [];
    this.currentConversation = null;
    this.automations = [];
    this.voiceActive = false;
    this.theme = localStorage.getItem('theme') || 'dark';
    
    this.init();
  }

  /**
   * Initialize app
   */
  async init() {
    console.log('🚀 OMNIUS App initializing...');
    
    // Register service worker
    this.registerServiceWorker();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize WebSocket
    this.initWebSocket();
    
    // Load saved data
    this.loadFromStorage();
    
    // Apply theme
    this.applyTheme();
    
    // Request permissions
    this.requestPermissions();
    
    console.log('✅ OMNIUS App ready');
  }

  /**
   * Register service worker for offline support
   */
  async registerServiceWorker() {
    if (!navigator.serviceWorker) {
      console.warn('⚠️  Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/client/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered');
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            this.showNotification('Update available', 'New version of OMNIUS installed');
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Initialize WebSocket for real-time updates
   */
  initWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.addEventListener('open', () => {
        console.log('✅ WebSocket connected');
        this.updateConnectionStatus(true);
      });
      
      this.socket.addEventListener('message', event => {
        this.handleWebSocketMessage(event.data);
      });
      
      this.socket.addEventListener('close', () => {
        console.log('❌ WebSocket disconnected');
        this.updateConnectionStatus(false);
        // Attempt reconnect after 3 seconds
        setTimeout(() => this.initWebSocket(), 3000);
      });
      
      this.socket.addEventListener('error', error => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('WebSocket init failed:', error);
    }
  }

  /**
   * Handle WebSocket messages (real-time updates)
   */
  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;
      
      switch (type) {
        case 'chat-response':
          this.displayAIResponse(payload);
          break;
        case 'voice-transcription':
          this.displayTranscription(payload);
          break;
        case 'automation-triggered':
          this.showNotification('Automation triggered', payload.name);
          break;
        case 'model-status':
          this.updateModelStatus(payload);
          break;
        default:
          console.log('Unknown WebSocket message:', type);
      }
    } catch (error) {
      console.error('WebSocket message handling failed:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Send message on Enter
    const input = document.getElementById('message-input');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Voice button
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    // Send button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectionStatus(true);
      this.initWebSocket();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionStatus(false);
    });
  }

  /**
   * Send message (real-time via WebSocket)
   */
  async sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;

    // Display user message
    this.displayMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    this.showTypingIndicator();

    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send via WebSocket (real-time)
        this.socket.send(JSON.stringify({
          type: 'message',
          conversationId: this.currentConversation,
          message: message
        }));
      } else {
        // Fallback to HTTP if WebSocket unavailable
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: this.currentConversation,
            message: message
          })
        });

        const data = await response.json();
        this.displayAIResponse(data);
      }
    } catch (error) {
      this.showError('Failed to send message: ' + error.message);
    }
  }

  /**
   * Display message in chat
   */
  displayMessage(message, role) {
    const chat = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${role}`;
    
    messageEl.innerHTML = `
      <div class="message-content">
        <p>${this.escapeHtml(message)}</p>
        <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;

    chat.appendChild(messageEl);
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Display AI response
   */
  displayAIResponse(payload) {
    const { response, model, tokens } = payload;
    
    this.removeTypingIndicator();
    this.displayMessage(response, 'assistant');
    
    // Update model info
    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
      modelInfo.textContent = `${model} (${tokens} tokens)`;
    }
  }

  /**
   * Voice input handling
   */
  async toggleVoiceInput() {
    if (this.voiceActive) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  /**
   * Start voice input
   */
  startVoiceInput() {
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.classList.add('active');
    this.voiceActive = true;

    // Show transcription UI
    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.classList.add('active');
      transcription.innerHTML = '<span class="listening">🎤 Listening...</span>';
    }

    // Send via WebSocket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'voice-start',
        language: this.getSelectedLanguage()
      }));
    }
  }

  /**
   * Stop voice input
   */
  stopVoiceInput() {
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.classList.remove('active');
    this.voiceActive = false;

    // Hide transcription UI
    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.classList.remove('active');
    }

    // Send via WebSocket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'voice-stop'
      }));
    }
  }

  /**
   * Display voice transcription
   */
  displayTranscription(payload) {
    const { text, confidence, isFinal } = payload;
    
    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.innerHTML = `
        <p>${this.escapeHtml(text)}</p>
        <span class="confidence">${(confidence * 100).toFixed(0)}% confident</span>
      `;
      
      if (isFinal) {
        const input = document.getElementById('message-input');
        input.value = text;
        this.stopVoiceInput();
      }
    }
  }

  /**
   * Create new conversation
   */
  newConversation() {
    this.currentConversation = `conv_${Date.now()}`;
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = `
      <div class="welcome-message">
        <h1>🤖 OMNIUS</h1>
        <p>Real AI Assistant</p>
        <p>How can I help you today?</p>
      </div>
    `;
  }

  /**
   * Show workflow builder
   */
  showWorkflowBuilder() {
    const modal = document.createElement('div');
    modal.className = 'modal workflow-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Build Automation</h2>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="workflow-builder">
            <div class="trigger-section">
              <h3>Trigger</h3>
              <select id="trigger-type">
                <option value="schedule">Schedule (Cron)</option>
                <option value="email">Email Arrival</option>
                <option value="webhook">Webhook Event</option>
              </select>
              <input type="text" id="trigger-config" placeholder="e.g., 0 9 * * *" />
            </div>

            <div class="actions-section">
              <h3>Actions</h3>
              <select id="action-type">
                <option value="email">Send Email</option>
                <option value="calendar">Create Event</option>
                <option value="ai-generate">Generate with AI</option>
                <option value="webhook">Trigger Webhook</option>
              </select>
              <textarea id="action-config" placeholder="Action configuration..."></textarea>
              <button onclick="document.querySelector('.app').addAction()">+ Add Action</button>
            </div>

            <div class="actions-list" id="actions-list"></div>

            <button class="btn btn-primary" onclick="document.querySelector('.app').createAutomation()">
              Create Automation
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Create automation
   */
  async createAutomation() {
    const triggerType = document.getElementById('trigger-type').value;
    const triggerConfig = document.getElementById('trigger-config').value;
    
    try {
      const response = await fetch('/api/automation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Automation ${new Date().toLocaleTimeString()}`,
          trigger: { type: triggerType, config: triggerConfig },
          actions: this.automations
        })
      });

      const data = await response.json();
      this.showNotification('Automation created', data.name);
      document.querySelector('.workflow-modal').remove();
    } catch (error) {
      this.showError('Failed to create automation: ' + error.message);
    }
  }

  /**
   * Save to storage
   */
  saveToStorage() {
    localStorage.setItem('omnius_conversations', JSON.stringify(this.conversations));
    localStorage.setItem('omnius_automations', JSON.stringify(this.automations));
  }

  /**
   * Load from storage
   */
  loadFromStorage() {
    this.conversations = JSON.parse(localStorage.getItem('omnius_conversations') || '[]');
    this.automations = JSON.parse(localStorage.getItem('omnius_automations') || '[]');
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(online) {
    const status = document.getElementById('connection-status');
    if (status) {
      status.className = `connection-status ${online ? 'online' : 'offline'}`;
      status.title = online ? 'Connected' : 'Offline mode';
    }
  }

  /**
   * Show notification
   */
  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon.svg'
      });
    }

    // Also show toast
    const toast = document.createElement('div');
    toast.className = 'toast notification';
    toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  /**
   * Show error
   */
  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  /**
   * Request permissions
   */
  requestPermissions() {
    // Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Microphone permission (for voice)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).catch(() => {});
    }
  }

  /**
   * Apply theme
   */
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get selected language
   */
  getSelectedLanguage() {
    return document.getElementById('language-select')?.value || 'en-US';
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    const chat = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chat.appendChild(indicator);
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Remove typing indicator
   */
  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  /**
   * Add action to workflow
   */
  addAction() {
    const actionType = document.getElementById('action-type').value;
    const actionConfig = document.getElementById('action-config').value;
    
    this.automations.push({ type: actionType, config: actionConfig });
    
    const list = document.getElementById('actions-list');
    const item = document.createElement('div');
    item.className = 'action-item';
    item.textContent = `${actionType}: ${actionConfig.substring(0, 30)}...`;
    list.appendChild(item);
    
    document.getElementById('action-config').value = '';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.omniusApp = new OMNIUSApp();
});
