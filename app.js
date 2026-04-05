/* Ominus AI - Multi-Provider Chatbot */
const App = {
    currentConversationId: null,
    currentModel: 'llama-3.3-70b-versatile',
    conversations: [],
    attachments: [],
    
    // Default API keys placeholder - users add via Settings UI
    defaultGroqKey: '',
    
    // Built-in models with all major providers
    builtinModels: [
        // Groq Models (Default)
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', icon: '🦙', desc: 'Powerful open source' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', icon: '⚡', desc: 'Fast & efficient' },
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', provider: 'groq', icon: '🐪', desc: 'Llama 4 - 17B params' },
        { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq', icon: '🤖', desc: 'OpenAI OSS 120B' },
        { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq', icon: '💡', desc: 'OpenAI OSS 20B' },
        { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'groq', icon: '🔮', desc: 'Alibaba Qwen3' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', icon: '🔄', desc: 'Mixture of experts' },
        { id: 'gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'groq', icon: '💎', desc: "Google's efficient model" },
        // Gemini Models
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', icon: '🔥', desc: 'Latest fast & versatile' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini', icon: '🚀', desc: 'Ultra-fast lightweight' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', icon: '🧠', desc: 'Advanced reasoning' },
        { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', provider: 'gemini', icon: '⚡', desc: 'Next-gen performance' },
        // OpenAI Models
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', icon: '🎯', desc: 'OpenAI flagship' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', icon: '🔹', desc: 'Fast & affordable' },
        { id: 'o1', name: 'o1', provider: 'openai', icon: '🧩', desc: 'Reasoning model' },
        { id: 'o3-mini', name: 'o3-mini', provider: 'openai', icon: '🎲', desc: 'Efficient reasoning' },
        // Anthropic Models
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', icon: '🎭', desc: 'Balanced & capable' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', icon: '🎪', desc: 'Most powerful' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', icon: '🎨', desc: 'Fast & lightweight' },
        // xAI Grok Models
        { id: 'grok-2', name: 'Grok-2', provider: 'xai', icon: '🚀', desc: 'xAI flagship' },
        { id: 'grok-2-latest', name: 'Grok-2 Latest', provider: 'xai', icon: '🌟', desc: 'Latest Grok' },
        { id: 'grok-beta', name: 'Grok Beta', provider: 'xai', icon: '⭐', desc: 'Beta version' },
    ],

    init() {
        this.loadApiKeys();
        this.loadConversations();
        this.bindEvents();
        this.renderModelList();
        this.updateModelSelector();
    },

    get models() {
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        return [...this.builtinModels, ...custom];
    },

    loadApiKeys() {
        this.apiKeys = {
            groq: localStorage.getItem('groq_api_key') || this.defaultGroqKey,
            gemini: localStorage.getItem('gemini_api_key') || '',
            openai: localStorage.getItem('openai_api_key') || '',
            anthropic: localStorage.getItem('anthropic_api_key') || '',
            xai: localStorage.getItem('xai_api_key') || '',
        };
        this.endpoints = {
            groq: localStorage.getItem('groq_endpoint') || 'https://api.groq.com/openai/v1/chat/completions',
            gemini: localStorage.getItem('gemini_endpoint') || 'https://generativelanguage.googleapis.com/v1beta/models',
            openai: localStorage.getItem('openai_endpoint') || 'https://api.openai.com/v1/chat/completions',
            anthropic: localStorage.getItem('anthropic_endpoint') || 'https://api.anthropic.com/v1/messages',
            xai: localStorage.getItem('xai_endpoint') || 'https://api.x.ai/v1/chat/completions',
        };
    },

    saveApiKeys() {
        Object.keys(this.apiKeys).forEach(key => {
            localStorage.setItem(`${key}_api_key`, this.apiKeys[key]);
        });
        Object.keys(this.endpoints).forEach(key => {
            localStorage.setItem(`${key}_endpoint`, this.endpoints[key]);
        });
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
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target === el) this.closeAllModals();
            });
        });
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('addCustomModel').addEventListener('click', () => this.addCustomModel());

        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                document.getElementById('messageInput').value = prompt;
                this.sendMessage();
            });
        });
    },

    async streamMessage(message, model, onChunk) {
        const modelInfo = this.models.find(m => m.id === model);
        if (!modelInfo) {
            onChunk({ type: 'error', content: 'Unknown model selected' });
            return;
        }

        const provider = modelInfo.provider;
        const key = this.apiKeys[provider];
        
        if (!key && provider !== 'groq') {
            onChunk({ type: 'error', content: `Please set your ${provider.toUpperCase()} API key in Settings` });
            return;
        }

        try {
            switch (provider) {
                case 'groq':
                    await this.streamGroq(message, model, onChunk, key);
                    break;
                case 'gemini':
                    await this.streamGemini(message, model, onChunk, key);
                    break;
                case 'openai':
                    await this.streamOpenAI(message, model, onChunk, key);
                    break;
                case 'anthropic':
                    await this.streamAnthropic(message, model, onChunk, key);
                    break;
                case 'xai':
                    await this.streamXAI(message, model, onChunk, key);
                    break;
                default:
                    onChunk({ type: 'error', content: `Provider ${provider} not supported yet` });
            }
        } catch (err) {
            onChunk({ type: 'error', content: err.message });
        }
    },

    async streamGroq(message, model, onChunk, key) {
        const response = await fetch(this.endpoints.groq, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                temperature: 0.7,
                max_tokens: 8192,
                stream: true
            })
        });

        await this.handleStreamResponse(response, onChunk);
    },

    async streamGemini(message, model, onChunk, key) {
        const url = `${this.endpoints.gemini}/${model}:streamGenerateContent?key=${key}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (content) onChunk({ type: 'content', content });
                        } catch (e) {}
                    }
                }
            }
        }
        onChunk({ type: 'done' });
    },

    async streamOpenAI(message, model, onChunk, key) {
        const response = await fetch(this.endpoints.openai, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                temperature: 0.7,
                max_tokens: 4096,
                stream: true
            })
        });

        await this.handleStreamResponse(response, onChunk);
    },

    async streamAnthropic(message, model, onChunk, key) {
        const response = await fetch(this.endpoints.anthropic, {
            method: 'POST',
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                max_tokens: 4096,
                stream: true
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === 'content_block_delta') {
                            const content = parsed.delta?.text;
                            if (content) onChunk({ type: 'content', content });
                        }
                    } catch (e) {}
                }
            }
        }
        onChunk({ type: 'done' });
    },

    async streamXAI(message, model, onChunk, key) {
        const response = await fetch(this.endpoints.xai, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                temperature: 0.7,
                stream: true
            })
        });

        await this.handleStreamResponse(response, onChunk);
    },

    async handleStreamResponse(response, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) onChunk({ type: 'content', content });
                        } catch (e) {}
                    }
                }
            }
        }
        onChunk({ type: 'done' });
    },

    createNewChat() {
        const id = Date.now().toString();
        const conversation = {
            id: id,
            title: 'New Chat',
            messages: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            model: this.currentModel
        };
        this.conversations.unshift(conversation);
        this.saveConversations();
        this.currentConversationId = id;
        this.renderConversations();
        this.clearChat();
    },

    loadConversations() {
        const saved = localStorage.getItem('ominus_conversations');
        this.conversations = saved ? JSON.parse(saved) : [];
        if (this.conversations.length === 0) {
            this.createNewChat();
        } else {
            this.renderConversations();
            this.loadConversation(this.conversations[0].id);
        }
    },

    saveConversations() {
        localStorage.setItem('ominus_conversations', JSON.stringify(this.conversations));
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

    loadConversation(id) {
        this.currentConversationId = id;
        this.renderConversations();
        const conversation = this.conversations.find(c => c.id === id);
        if (conversation) {
            this.renderMessages(conversation.messages);
        }
    },

    deleteConversation(id) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        this.saveConversations();
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
                
                this.conversations.find(c => c.id === this.currentConversationId).messages.splice(index);
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
            this.createNewChat();
        }

        const welcomeScreen = document.getElementById('welcomeScreen');
        const messagesContainer = document.getElementById('messages');
        
        welcomeScreen.style.display = 'none';

        let fullContent = content;
        if (this.attachments.length > 0) {
            const attachmentText = this.attachments.map(a => `[${a.name}]`).join(' ');
            fullContent = `${attachmentText}\n\n${content}`;
        }

        const userMessage = { role: 'user', content: fullContent, timestamp: new Date().toISOString() };
        const conversation = this.conversations.find(c => c.id === this.currentConversationId);
        conversation.messages.push(userMessage);
        conversation.updated_at = new Date().toISOString();
        this.saveConversations();

        const userMessageEl = this.createMessageElement('user', fullContent);
        messagesContainer.appendChild(userMessageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const assistantMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
        const assistantMessageEl = this.createMessageElement('assistant', '');
        assistantMessageEl.classList.add('streaming');
        messagesContainer.appendChild(assistantMessageEl);

        const onChunk = (chunk) => {
            if (chunk.type === 'content') {
                assistantMessage.content += chunk.content;
                const contentDiv = assistantMessageEl.querySelector('.message-text');
                contentDiv.dataset.raw = assistantMessage.content;
                contentDiv.innerHTML = this.renderMarkdown(assistantMessage.content);
                this.highlightCodeBlocks(contentDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else if (chunk.type === 'done') {
                assistantMessageEl.classList.remove('streaming');
                this.addMessageActions(assistantMessageEl);
                conversation.messages.push(assistantMessage);
                this.saveConversations();
                
                if (conversation.messages.length === 2) {
                    conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                    this.renderConversations();
                }
            } else if (chunk.type === 'error') {
                assistantMessage.content = chunk.content;
                const contentDiv = assistantMessageEl.querySelector('.message-text');
                contentDiv.dataset.raw = chunk.content;
                contentDiv.textContent = chunk.content;
                assistantMessageEl.classList.remove('streaming');
            }
        };

        await this.streamMessage(content, this.currentModel, onChunk);
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
            const reader = new FileReader();
            reader.onload = (event) => {
                this.attachments.push({
                    id: Date.now().toString(),
                    name: file.name,
                    content: event.target.result
                });
                this.renderAttachments();
            };
            reader.readAsDataURL(file);
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

    closeAllModals() {
        document.querySelectorAll('.model-modal, .settings-modal').forEach(el => {
            el.classList.remove('active');
        });
    },

    openSettingsModal() {
        document.getElementById('groqKey').value = this.apiKeys.groq;
        document.getElementById('geminiKey').value = this.apiKeys.gemini;
        document.getElementById('openaiKey').value = this.apiKeys.openai;
        document.getElementById('anthropicKey').value = this.apiKeys.anthropic;
        document.getElementById('xaiKey').value = this.apiKeys.xai;
        
        document.getElementById('groqEndpoint').value = this.endpoints.groq;
        document.getElementById('geminiEndpoint').value = this.endpoints.gemini;
        document.getElementById('openaiEndpoint').value = this.endpoints.openai;
        document.getElementById('anthropicEndpoint').value = this.endpoints.anthropic;
        document.getElementById('xaiEndpoint').value = this.endpoints.xai;
        
        this.renderCustomModelsList();
        document.getElementById('settingsModal').classList.add('active');
    },

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
    },

    saveSettings() {
        this.apiKeys = {
            groq: document.getElementById('groqKey').value.trim() || this.defaultGroqKey,
            gemini: document.getElementById('geminiKey').value.trim(),
            openai: document.getElementById('openaiKey').value.trim(),
            anthropic: document.getElementById('anthropicKey').value.trim(),
            xai: document.getElementById('xaiKey').value.trim(),
        };
        
        this.endpoints = {
            groq: document.getElementById('groqEndpoint').value.trim() || 'https://api.groq.com/openai/v1/chat/completions',
            gemini: document.getElementById('geminiEndpoint').value.trim() || 'https://generativelanguage.googleapis.com/v1beta/models',
            openai: document.getElementById('openaiEndpoint').value.trim() || 'https://api.openai.com/v1/chat/completions',
            anthropic: document.getElementById('anthropicEndpoint').value.trim() || 'https://api.anthropic.com/v1/messages',
            xai: document.getElementById('xaiEndpoint').value.trim() || 'https://api.x.ai/v1/chat/completions',
        };
        
        this.saveApiKeys();
        this.closeSettingsModal();
    },

    renderCustomModelsList() {
        const container = document.getElementById('customModelsList');
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        
        container.innerHTML = custom.map((model, index) => `
            <div class="custom-model-item">
                <span>${model.name} (${model.provider})</span>
                <button onclick="App.deleteCustomModel(${index})">Delete</button>
            </div>
        `).join('');
    },

    addCustomModel() {
        const id = document.getElementById('customModelId').value.trim();
        const name = document.getElementById('customModelName').value.trim();
        const provider = document.getElementById('customModelProvider').value;
        const icon = document.getElementById('customModelIcon').value.trim() || '🤖';
        const desc = document.getElementById('customModelDesc').value.trim() || 'Custom model';
        
        if (!id || !name) {
            alert('Model ID and Name are required');
            return;
        }
        
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        custom.push({ id, name, provider, icon, desc });
        localStorage.setItem('custom_models', JSON.stringify(custom));
        
        document.getElementById('customModelId').value = '';
        document.getElementById('customModelName').value = '';
        document.getElementById('customModelIcon').value = '';
        document.getElementById('customModelDesc').value = '';
        
        this.renderCustomModelsList();
    },

    deleteCustomModel(index) {
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        custom.splice(index, 1);
        localStorage.setItem('custom_models', JSON.stringify(custom));
        this.renderCustomModelsList();
    },

    renderModelList() {
        const providers = ['groq', 'gemini', 'openai', 'anthropic', 'xai'];
        const providerNames = {
            groq: 'Groq (Default)',
            gemini: 'Google Gemini',
            openai: 'OpenAI',
            anthropic: 'Anthropic Claude',
            xai: 'xAI Grok'
        };
        
        const container = document.getElementById('modelList');
        container.innerHTML = providers.map(provider => {
            const models = this.models.filter(m => m.provider === provider);
            if (models.length === 0) return '';
            return `
                <div class="model-section">
                    <div class="model-section-title">${providerNames[provider]}</div>
                    ${models.map(m => this.renderModelOption(m)).join('')}
                </div>
            `;
        }).join('');
        
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
