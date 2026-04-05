/**
 * OMNIUS Phase 3 - Enhanced Frontend PWA
 * Real-time WebSocket, voice I/O, workflow automation, offline support
 * 100% Production Ready
 */

class OMNIUSApp {
  constructor() {
    this.socket = null;
    this.isOnline = navigator.onLine;
    this.conversations = new Map();
    this.currentConversation = null;
    this.automations = new Map();
    this.voiceActive = false;
    this.theme = localStorage.getItem('theme') || 'auto';
    this.selectedModel = localStorage.getItem('model') || 'groq';
    this.voiceLanguage = localStorage.getItem('voice-lang') || 'en-US';
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }

  /**
   * Initialize app
   */
  async init() {
    console.log('🚀 OMNIUS App initializing...');
    
    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize WebSocket
      this.initWebSocket();
      
      // Load saved data
      this.loadFromStorage();
      
      // Apply theme
      this.applyTheme();
      
      // Request permissions (microphone, notifications)
      await this.requestPermissions();
      
      // Check API health
      await this.checkApiHealth();
      
      // Setup online/offline listeners
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      console.log('✅ OMNIUS App ready');
    } catch (error) {
      console.error('❌ Initialization error:', error);
      this.showNotification('Initialization error', error.message, 'error');
    }
  }

  /**
   * Register service worker for offline support
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/client/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered');
      
      // Check for updates periodically
      setInterval(() => registration.update(), 60000);
      
      // Listen for controller change (update installed)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  /**
   * Initialize WebSocket for real-time communication
   */
  initWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.addEventListener('open', () => {
        console.log('✅ WebSocket connected');
        this.updateConnectionStatus(true);
        this.reconnectAttempts = 0;
        this.processPendingMessages();
      });
      
      this.socket.addEventListener('message', event => {
        try {
          this.handleWebSocketMessage(JSON.parse(event.data));
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });
      
      this.socket.addEventListener('close', () => {
        console.log('❌ WebSocket disconnected');
        this.updateConnectionStatus(false);
        this.attemptReconnect();
      });
      
      this.socket.addEventListener('error', error => {
        console.error('❌ WebSocket error:', error);
      });
    } catch (error) {
      console.error('❌ WebSocket initialization failed:', error);
    }
  }

  /**
   * Attempt to reconnect WebSocket with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.showNotification('Connection failed', 'Unable to reconnect to server', 'error');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`⏳ Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.initWebSocket(), delay);
  }

  /**
   * Handle online status
   */
  handleOnline() {
    console.log('✅ Online');
    this.isOnline = true;
    this.showNotification('You are online', 'Syncing messages...', 'info');
    this.processPendingMessages();
  }

  /**
   * Handle offline status
   */
  handleOffline() {
    console.log('❌ Offline');
    this.isOnline = false;
    this.updateConnectionStatus(false);
    this.showNotification('You are offline', 'Messages will sync when online', 'warning');
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'message':
        this.displayMessage(payload);
        break;
      case 'typing':
        this.showTypingIndicator(payload);
        break;
      case 'voice-transcription':
        this.displayTranscription(payload);
        break;
      case 'voice-response':
        this.playVoiceResponse(payload);
        break;
      case 'automation-triggered':
        this.handleAutomationTrigger(payload);
        break;
      case 'notification':
        this.showNotification(payload.title, payload.message, payload.type);
        break;
      case 'error':
        console.error('❌ Server error:', payload.message);
        this.showNotification('Error', payload.message, 'error');
        break;
      default:
        console.log('❓ Unknown message type:', type);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Send message
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const input = document.getElementById('message-input');

    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (voiceBtn) voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    if (input) {
      input.addEventListener('keypress', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Menu button
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.showMenu());
    }

    // Workflow modal events
    this.setupWorkflowBuilder();

    // Settings modal events
    this.setupSettings();

    // Close modals on background click
    document.addEventListener('click', event => {
      if (event.target.classList.contains('modal')) {
        this.closeModal(event.target.id);
      }
    });
  }

  /**
   * Send message
   */
  async sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    // Add to UI immediately
    this.displayMessage({ role: 'user', content: message });
    input.value = '';
    input.focus();

    // Queue if offline
    if (!this.isOnline || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push({ type: 'message', content: message });
      this.showNotification('Queued', 'Message saved, will send when online', 'info');
      return;
    }

    // Send via WebSocket
    this.socket.send(JSON.stringify({
      type: 'message',
      content: message,
      model: this.selectedModel,
      conversation: this.currentConversation
    }));
  }

  /**
   * Display message in chat
   */
  displayMessage(data) {
    const { role, content } = data;
    const chat = document.getElementById('chat-messages');
    
    if (chat.querySelector('.welcome-message')) {
      chat.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${this.escapeHtml(content)}</p>
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;

    // Save to storage
    this.saveToStorage();
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator(data) {
    const chat = document.getElementById('chat-messages');
    
    let indicator = chat.querySelector('.typing-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = '<span></span><span></span><span></span>';
      chat.appendChild(indicator);
    }

    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Voice input handling
   */
  async toggleVoiceInput() {
    if (this.voiceActive) {
      this.stopVoiceInput();
    } else {
      await this.startVoiceInput();
    }
  }

  /**
   * Start voice input
   */
  async startVoiceInput() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showNotification('Not supported', 'Speech recognition not supported in this browser', 'error');
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      const recognition = new SpeechRecognition();
      recognition.language = this.voiceLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;

      this.voiceActive = true;
      const voiceBtn = document.getElementById('voice-btn');
      voiceBtn.classList.add('active');
      voiceBtn.setAttribute('aria-pressed', 'true');

      // Show transcription UI
      const transcription = document.getElementById('voice-transcription');
      if (transcription) {
        transcription.classList.add('active');
        transcription.innerHTML = '<span class="listening">🎤 Listening...</span>';
      }

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.displayFinalTranscription(transcript);
          } else {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript) {
          this.displayInterimTranscription(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        this.showNotification('Error', `Speech recognition error: ${event.error}`, 'error');
        this.stopVoiceInput();
      };

      recognition.onend = () => {
        this.stopVoiceInput();
      };

      recognition.start();
    } catch (error) {
      console.error('❌ Microphone error:', error);
      this.showNotification('Microphone error', error.message, 'error');
      this.voiceActive = false;
    }
  }

  /**
   * Stop voice input
   */
  stopVoiceInput() {
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.classList.remove('active');
    voiceBtn.setAttribute('aria-pressed', 'false');
    this.voiceActive = false;

    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.classList.remove('active');
    }
  }

  /**
   * Display interim transcription
   */
  displayInterimTranscription(text) {
    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.innerHTML = `
        <span class="listening">🎤 Listening...</span>
        <span style="opacity: 0.7; margin-left: 8px;">${this.escapeHtml(text)}</span>
      `;
    }
  }

  /**
   * Display final transcription
   */
  displayFinalTranscription(text) {
    const input = document.getElementById('message-input');
    input.value = text;
    
    const transcription = document.getElementById('voice-transcription');
    if (transcription) {
      transcription.innerHTML = `<p>✅ ${this.escapeHtml(text)}</p>`;
    }

    // Auto-send after 1 second
    setTimeout(() => {
      this.stopVoiceInput();
      this.sendMessage();
    }, 1000);
  }

  /**
   * Play voice response
   */
  async playVoiceResponse(payload) {
    const { audioUrl, text } = payload;
    
    try {
      const audio = new Audio(audioUrl);
      audio.play();
      this.showNotification('Voice response', text, 'info');
    } catch (error) {
      console.error('❌ Failed to play audio:', error);
    }
  }

  /**
   * Setup workflow builder
   */
  setupWorkflowBuilder() {
    const triggerSelect = document.getElementById('trigger-type');
    const actionSelect = document.getElementById('action-type');
    const addActionBtn = document.getElementById('add-action-btn');
    const saveBtn = document.getElementById('save-automation');

    if (triggerSelect) {
      triggerSelect.addEventListener('change', (e) => {
        this.showTriggerOptions(e.target.value);
      });
    }

    if (addActionBtn) {
      addActionBtn.addEventListener('click', () => {
        const actionType = actionSelect.value;
        if (actionType) {
          this.addActionToList(actionType);
          actionSelect.value = '';
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveWorkflow();
      });
    }
  }

  /**
   * Show trigger-specific options
   */
  showTriggerOptions(triggerType) {
    document.querySelectorAll('#workflow-modal [id*="-options"]').forEach(el => {
      el.style.display = 'none';
    });

    if (triggerType) {
      const optionsId = `${triggerType}-options`;
      const options = document.getElementById(optionsId);
      if (options) {
        options.style.display = 'block';
      }
    }
  }

  /**
   * Add action to workflow
   */
  addActionToList(actionType) {
    const actionsList = document.getElementById('actions-list');
    const actionItem = document.createElement('div');
    actionItem.className = 'action-item';
    
    const actionNames = {
      'send-email': '📧 Send Email',
      'calendar': '📅 Create Calendar Event',
      'ai-generate': '✨ Generate with AI',
      'webhook': '🔗 Trigger Webhook',
      'notify': '🔔 Send Notification'
    };

    actionItem.innerHTML = `
      <span>${actionNames[actionType] || actionType}</span>
      <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; cursor: pointer;">✕</button>
    `;
    
    actionsList.appendChild(actionItem);
  }

  /**
   * Save workflow automation
   */
  async saveWorkflow() {
    const triggerType = document.getElementById('trigger-type').value;
    
    if (!triggerType) {
      this.showNotification('Error', 'Please select a trigger', 'error');
      return;
    }

    const actions = [];
    document.querySelectorAll('.action-item').forEach(item => {
      actions.push(item.textContent.trim());
    });

    if (actions.length === 0) {
      this.showNotification('Error', 'Please add at least one action', 'error');
      return;
    }

    const workflow = {
      id: `workflow_${Date.now()}`,
      trigger: triggerType,
      actions: actions,
      createdAt: new Date().toISOString()
    };

    this.automations.set(workflow.id, workflow);
    this.saveToStorage();

    // Send to backend
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'create-automation',
        workflow: workflow
      }));
    }

    this.showNotification('Success', 'Automation created!', 'success');
    this.closeModal('workflow-modal');
  }

  /**
   * Handle automation trigger
   */
  handleAutomationTrigger(payload) {
    const { automationId, result, message } = payload;
    this.showNotification('Automation executed', message || 'Automation ran successfully', 'info');
    console.log(`✅ Automation ${automationId} triggered:`, result);
  }

  /**
   * Setup settings
   */
  setupSettings() {
    const modelSelect = document.getElementById('ai-model-select');
    const languageSelect = document.getElementById('voice-language');
    const themeSelect = document.getElementById('theme-select');
    const notificationsToggle = document.getElementById('notifications-toggle');

    if (modelSelect) {
      modelSelect.value = this.selectedModel;
      modelSelect.addEventListener('change', (e) => {
        this.selectedModel = e.target.value;
        localStorage.setItem('model', this.selectedModel);
      });
    }

    if (languageSelect) {
      languageSelect.value = this.voiceLanguage;
      languageSelect.addEventListener('change', (e) => {
        this.voiceLanguage = e.target.value;
        localStorage.setItem('voice-lang', this.voiceLanguage);
      });
    }

    if (themeSelect) {
      themeSelect.value = this.theme;
      themeSelect.addEventListener('change', (e) => {
        this.theme = e.target.value;
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
      });
    }

    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', (e) => {
        localStorage.setItem('notifications', e.target.checked);
        if (e.target.checked && 'Notification' in window) {
          Notification.requestPermission();
        }
      });
    }

    // Check API status
    this.checkApiStatus();
  }

  /**
   * Check API health
   */
  async checkApiHealth() {
    try {
      const response = await fetch('/health', { timeout: 5000 });
      if (response.ok) {
        console.log('✅ API healthy');
      }
    } catch (error) {
      console.warn('⚠️ API health check failed:', error);
    }
  }

  /**
   * Check API status for settings
   */
  checkApiStatus() {
    const groqStatus = document.getElementById('groq-status');
    const backendStatus = document.getElementById('backend-status');

    if (groqStatus) {
      groqStatus.textContent = this.isOnline ? '✅ Available' : '❌ Offline';
    }

    if (backendStatus) {
      const isConnected = this.socket && this.socket.readyState === WebSocket.OPEN;
      backendStatus.textContent = isConnected ? '✅ Connected' : '❌ Disconnected';
    }
  }

  /**
   * Apply theme
   */
  applyTheme() {
    const html = document.documentElement;
    
    if (this.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', this.theme);
    }

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      const isDark = html.getAttribute('data-theme') === 'dark';
      themeBtn.textContent = isDark ? '☀️' : '🌙';
    }
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    if (this.theme === 'dark') {
      this.theme = 'light';
    } else if (this.theme === 'light') {
      this.theme = 'auto';
    } else {
      this.theme = 'dark';
    }
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  /**
   * Request permissions
   */
  async requestPermissions() {
    // Microphone
    try {
      await navigator.permissions.query({ name: 'microphone' });
    } catch (error) {
      console.warn('⚠️ Microphone permission check failed:', error);
    }

    // Notifications
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'info') {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon.svg',
        tag: 'omnius'
      });
    }

    // In-app toast
    this.showToast(title, message, type);
  }

  /**
   * Show toast notification
   */
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toasts-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <strong>${this.escapeHtml(title)}</strong>
      <p>${this.escapeHtml(message)}</p>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(isConnected) {
    const status = document.getElementById('connection-status');
    if (status) {
      if (isConnected) {
        status.classList.add('online');
        status.title = 'Online';
      } else {
        status.classList.remove('online');
        status.title = 'Offline';
      }
    }
  }

  /**
   * Show menu
   */
  showMenu() {
    const modal = document.getElementById('workflow-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Close modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Process pending messages when reconnected
   */
  async processPendingMessages() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} pending messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const msg of queue) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Save data to local storage
   */
  saveToStorage() {
    const data = {
      conversations: Array.from(this.conversations.entries()),
      automations: Array.from(this.automations.entries()),
      theme: this.theme,
      model: this.selectedModel,
      voiceLanguage: this.voiceLanguage
    };
    localStorage.setItem('omnius-state', JSON.stringify(data));
  }

  /**
   * Load data from local storage
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('omnius-state') || '{}');
      
      if (data.conversations) {
        this.conversations = new Map(data.conversations);
      }
      if (data.automations) {
        this.automations = new Map(data.automations);
      }
      if (data.theme) this.theme = data.theme;
      if (data.model) this.selectedModel = data.model;
      if (data.voiceLanguage) this.voiceLanguage = data.voiceLanguage;
    } catch (error) {
      console.error('❌ Failed to load from storage:', error);
    }
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Get selected language
   */
  getSelectedLanguage() {
    const select = document.getElementById('voice-language');
    return select ? select.value : this.voiceLanguage;
  }

  /**
   * Save state before unload
   */
  saveState() {
    this.saveToStorage();
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.omniusApp = new OMNIUSApp();
  });
} else {
  window.omniusApp = new OMNIUSApp();
}

// Save state before unload
window.addEventListener('beforeunload', () => {
  if (window.omniusApp) {
    window.omniusApp.saveState();
  }
});
