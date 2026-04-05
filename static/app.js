const App = {
    currentConversationId: null,
    currentModel: 'gemini-2.0-flash',
    ws: null,
    conversations: [],
    attachments: [],
    models: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', icon: '⚡', desc: 'Fast and versatile' },
        { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', provider: 'Google', icon: '💭', desc: 'Experimental thinking' },
        { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro', provider: 'Google', icon: '🧠', desc: 'Advanced reasoning' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq', icon: '🦙', desc: 'Powerful open source' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'Groq', icon: '🦙', desc: 'Fast & efficient' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Groq', icon: '🔄', desc: 'Mixture of experts' },
        { id: 'gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'Groq', icon: '💎', desc: "Google's efficient model" },
    ],

    init() {
        this.bindEvents();
        this.loadConversations();
        this.initWebSocket();
        this.renderModelList();
        this.updateModelSelector();
    },

    bindEvents() {
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('messageInput').addEventListener('input', (e) => this.handleInput(e));
        document.getElementById('messageInput').addEventListener('keydown', (e) => this.handleKeydown(e));
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('attachBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('modelSelector').addEventListener('click', () => this.openModelModal());
        document.getElementById('closeModelModal').addEventListener('click', () => this.closeModelModal());
        document.querySelector('.modal-overlay').addEventListener('click', () => this.closeModelModal());

        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                document.getElementById('messageInput').value = prompt;
                this.sendMessage();
            });
        });
    },

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/conversations/stream`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleStreamMessage(data);
        };
        
        this.ws.onclose = () => {
            setTimeout(() => this.initWebSocket(), 3000);
        };
    },

    handleStreamMessage(data) {
        const messagesContainer = document.getElementById('messages');
        let assistantMessage = messagesContainer.querySelector('.streaming');

        if (data.type === 'content') {
            if (!assistantMessage) {
                assistantMessage = this.createMessageElement('assistant', '');
                assistantMessage.classList.add('streaming');
                messagesContainer.appendChild(assistantMessage);
            }
            
            const contentDiv = assistantMessage.querySelector('.message-text');
            const currentText = contentDiv.dataset.raw || '';
            const newText = currentText + data.content;
            contentDiv.dataset.raw = newText;
            contentDiv.innerHTML = this.renderMarkdown(newText);
            this.highlightCodeBlocks(contentDiv);
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else if (data.type === 'done') {
            if (assistantMessage) {
                assistantMessage.classList.remove('streaming');
                this.addMessageActions(assistantMessage);
            }
        } else if (data.type === 'error') {
            if (!assistantMessage) {
                assistantMessage = this.createMessageElement('assistant', data.content);
                messagesContainer.appendChild(assistantMessage);
            }
            assistantMessage.classList.remove('streaming');
        }
    },

    async createNewChat() {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Chat' })
        });
        
        const conversation = await response.json();
        this.conversations.unshift(conversation);
        this.currentConversationId = conversation.id;
        this.renderConversations();
        this.clearChat();
    },

    async loadConversations() {
        const response = await fetch('/api/conversations');
        this.conversations = await response.json();
        this.renderConversations();
        
        if (this.conversations.length === 0) {
            await this.createNewChat();
        }
    },

    renderConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" data-id="${conv.id}">
                <svg class="conversation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
                <span class="conversation-title">${this.escapeHtml(conv.title)}</span>
                <div class="conversation-actions">
                    <button class="conversation-action delete-conv" data-id="${conv.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-conv')) {
                    this.loadConversation(item.dataset.id);
                }
            });
        });

        container.querySelectorAll('.delete-conv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteConversation(btn.dataset.id);
            });
        });
    },

    async loadConversation(id) {
        this.currentConversationId = id;
        this.renderConversations();
        
        const response = await fetch(`/api/conversations/${id}`);
        if (response.ok) {
            const conversation = await response.json();
            this.renderMessages(conversation.messages);
        }
    },

    async deleteConversation(id) {
        await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
        this.conversations = this.conversations.filter(c => c.id !== id);
        this.renderConversations();
        
        if (this.currentConversationId === id) {
            this.currentConversationId = null;
            this.clearChat();
            if (this.conversations.length > 0) {
                this.loadConversation(this.conversations[0].id);
            } else {
                this.createNewChat();
            }
        }
    },

    renderMessages(messages) {
        const container = document.getElementById('messages');
        const welcomeScreen = document.getElementById('welcomeScreen');
        
        if (messages.length > 0) {
            welcomeScreen.style.display = 'none';
            container.innerHTML = '';
            messages.forEach(msg => {
                const el = this.createMessageElement(msg.role, msg.content);
                container.appendChild(el);
                this.addMessageActions(el);
            });
        } else {
            welcomeScreen.style.display = 'flex';
            container.innerHTML = '';
        }
    },

    createMessageElement(role, content) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        const author = role === 'user' ? 'You' : 'Ominus';
        
        div.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text" data-raw="${this.escapeHtml(content)}">${this.renderMarkdown(content)}</div>
            </div>
        `;
        
        this.highlightCodeBlocks(div.querySelector('.message-text'));
        return div;
    },

    renderMarkdown(content) {
        if (!content) return '';
        
        marked.setOptions({
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        
        return marked.parse(content);
    },

    highlightCodeBlocks(container) {
        if (!container) return;
        
        container.querySelectorAll('pre code').forEach(block => {
            const pre = block.parentElement;
            if (!pre.querySelector('.code-block-header')) {
                const lang = block.className.match(/language-(\w+)/)?.[1] || 'text';
                const header = document.createElement('div');
                header.className = 'code-block-header';
                header.innerHTML = `
                    <span class="code-block-lang">${lang}</span>
                    <button class="code-block-copy">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                        </svg>
                        Copy
                    </button>
                `;
                
                header.querySelector('.code-block-copy').addEventListener('click', () => {
                    navigator.clipboard.writeText(block.textContent);
                    const btn = header.querySelector('.code-block-copy');
                    btn.innerHTML = 'Copied!';
                    setTimeout(() => {
                        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> Copy`;
                    }, 2000);
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block';
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(header);
                wrapper.appendChild(pre);
            }
        });
        
        hljs.highlightAll();
    },

    addMessageActions(messageEl) {
        const contentDiv = messageEl.querySelector('.message-content');
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="message-action copy-action">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
                Copy
            </button>
            <button class="message-action regenerate-action">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"></path>
                </svg>
                Regenerate
            </button>
        `;
        
        actions.querySelector('.copy-action').addEventListener('click', () => {
            const text = messageEl.querySelector('.message-text').dataset.raw;
            navigator.clipboard.writeText(text);
        });
        
        actions.querySelector('.regenerate-action').addEventListener('click', () => {
            const messagesContainer = document.getElementById('messages');
            const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
            const index = allMessages.indexOf(messageEl);
            
            if (index > 0) {
                const prevMessage = allMessages[index - 1];
                const content = prevMessage.querySelector('.message-text').dataset.raw;
                
                for (let i = allMessages.length - 1; i >= index; i--) {
                    allMessages[i].remove();
                }
                
                this.sendMessageWithContent(content);
            }
        });
        
        contentDiv.appendChild(actions);
    },

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content && this.attachments.length === 0) return;
        
        await this.sendMessageWithContent(content);
        
        input.value = '';
        input.style.height = 'auto';
        this.attachments = [];
        this.renderAttachments();
    },

    async sendMessageWithContent(content) {
        if (!this.currentConversationId) {
            await this.createNewChat();
        }

        const welcomeScreen = document.getElementById('welcomeScreen');
        const messagesContainer = document.getElementById('messages');
        
        welcomeScreen.style.display = 'none';

        let fullContent = content;
        if (this.attachments.length > 0) {
            const attachmentText = this.attachments.map(a => `[${a.name}]`).join(' ');
            fullContent = `${attachmentText}\n\n${content}`;
        }

        const userMessage = this.createMessageElement('user', fullContent);
        messagesContainer.appendChild(userMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        await fetch(`/api/conversations/${this.currentConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: fullContent, 
                model: this.currentModel,
                attachments: this.attachments.map(a => a.id)
            })
        });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                message: content,
                model: this.currentModel
            }));
        }
    },

    handleInput(e) {
        const input = e.target;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = input.value.trim().length === 0 && this.attachments.length === 0;
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    },

    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                this.attachments.push({
                    id: result.id,
                    name: result.name,
                    url: result.url
                });
                this.renderAttachments();
            } catch (err) {
                console.error('Upload failed:', err);
            }
        }
        
        e.target.value = '';
    },

    renderAttachments() {
        const container = document.getElementById('attachmentsPreview');
        container.innerHTML = this.attachments.map((att, index) => `
            <div class="attachment-chip">
                <span>${this.escapeHtml(att.name)}</span>
                <button onclick="App.removeAttachment(${index})">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    removeAttachment(index) {
        this.attachments.splice(index, 1);
        this.renderAttachments();
    },

    openModelModal() {
        document.getElementById('modelModal').classList.add('active');
    },

    closeModelModal() {
        document.getElementById('modelModal').classList.remove('active');
    },

    renderModelList() {
        const gemini = this.models.filter(m => m.provider === 'Google');
        const groq = this.models.filter(m => m.provider === 'Groq');
        
        const container = document.getElementById('modelList');
        container.innerHTML = `
            <div class="model-section">
                <div class="model-section-title">Google Gemini</div>
                ${gemini.map(m => this.renderModelOption(m)).join('')}
            </div>
            <div class="model-section">
                <div class="model-section-title">Groq</div>
                ${groq.map(m => this.renderModelOption(m)).join('')}
            </div>
        `;
        
        container.querySelectorAll('.model-option').forEach(el => {
            el.addEventListener('click', () => {
                this.currentModel = el.dataset.model;
                this.updateModelSelector();
                this.closeModelModal();
            });
        });
    },

    renderModelOption(model) {
        const selected = model.id === this.currentModel ? 'selected' : '';
        return `
            <div class="model-option ${selected}" data-model="${model.id}">
                <span class="model-option-icon">${model.icon}</span>
                <div class="model-option-info">
                    <div class="model-option-name">${model.name}</div>
                    <div class="model-option-desc">${model.desc}</div>
                </div>
                <svg class="model-option-check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        `;
    },

    updateModelSelector() {
        const model = this.models.find(m => m.id === this.currentModel);
        if (model) {
            const selector = document.getElementById('modelSelector');
            selector.querySelector('.model-icon').textContent = model.icon;
            selector.querySelector('.model-name').textContent = model.name;
        }
    },

    clearChat() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('messages').innerHTML = '';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
