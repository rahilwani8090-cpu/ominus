/* Ominus AI - Voice & Automation Module */

const VoiceModule = {
    recognition: null,
    synthesis: null,
    isListening: false,
    currentLanguage: 'en-US',
    autoPlayVoice: false,
    voiceSpeed: 1,

    init() {
        // Speech Recognition Setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.setupRecognitionListeners();
        }

        // Bind UI Events - with safety checks
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        
        const voiceOutputBtn = document.getElementById('voiceOutputBtn');
        if (voiceOutputBtn) voiceOutputBtn.addEventListener('click', () => this.toggleVoiceOutput());
        
        // Voice Settings - with safety checks
        const voiceInputLang = document.getElementById('voiceInputLang');
        if (voiceInputLang) {
            voiceInputLang.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
            });
        }
        
        const voiceSpeed = document.getElementById('voiceSpeed');
        if (voiceSpeed) {
            voiceSpeed.addEventListener('input', (e) => {
                this.voiceSpeed = parseFloat(e.target.value);
                const speedValue = document.getElementById('voiceSpeedValue');
                if (speedValue) speedValue.textContent = this.voiceSpeed + 'x';
            });
        }

        const autoPlayVoice = document.getElementById('autoPlayVoice');
        if (autoPlayVoice) {
            autoPlayVoice.addEventListener('change', (e) => {
                this.autoPlayVoice = e.target.checked;
            });
        }

        // Load saved settings
        this.loadVoiceSettings();
    },

    loadVoiceSettings() {
        const lang = localStorage.getItem('voiceInputLang') || 'en-US';
        const speed = parseFloat(localStorage.getItem('voiceSpeed') || '1');
        const autoPlay = localStorage.getItem('autoPlayVoice') === 'true';
        
        const voiceInputLang = document.getElementById('voiceInputLang');
        if (voiceInputLang) voiceInputLang.value = lang;
        
        const voiceSpeed = document.getElementById('voiceSpeed');
        if (voiceSpeed) voiceSpeed.value = speed;
        
        const autoPlayVoice = document.getElementById('autoPlayVoice');
        if (autoPlayVoice) autoPlayVoice.checked = autoPlay;
        
        this.currentLanguage = lang;
        this.voiceSpeed = speed;
        this.autoPlayVoice = autoPlay;
    },

    setupRecognitionListeners() {
        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('voiceBtn').classList.add('active');
            document.getElementById('voiceStatus').style.display = 'flex';
            document.getElementById('voiceStatusText').textContent = 'Listening...';
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            const input = document.getElementById('messageInput');
            if (finalTranscript) {
                input.value = finalTranscript;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (interimTranscript) {
                document.getElementById('voiceStatusText').textContent = `Heard: "${interimTranscript}"`;
            }
        };

        this.recognition.onerror = (event) => {
            document.getElementById('voiceStatusText').textContent = `Error: ${event.error}`;
            console.error('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('voiceStatus').style.display = 'none';
        };
    },

    toggleVoiceInput() {
        if (!this.recognition) {
            alert('Speech recognition not supported in your browser. Try Chrome, Edge, or Safari.');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.lang = this.currentLanguage;
            this.recognition.start();
        }
    },

    async toggleVoiceOutput() {
        const btn = document.getElementById('voiceOutputBtn');
        if (btn.classList.contains('active')) {
            this.stopSpeaking();
            btn.classList.remove('active');
        } else {
            btn.classList.add('active');
        }
    },

    async speakText(text, lang = null) {
        if (!this.autoPlayVoice && !document.getElementById('voiceOutputBtn').classList.contains('active')) {
            return;
        }

        lang = lang || document.getElementById('voiceOutputLang').value;
        
        try {
            // Try Google Cloud TTS first
            const ttsKey = localStorage.getItem('googleTtsKey');
            if (ttsKey) {
                await this.useGoogleTTS(text, lang, ttsKey);
            } else {
                // Fallback to browser TTS
                this.useBrowserTTS(text, lang);
            }
        } catch (error) {
            console.error('Voice output error:', error);
            this.useBrowserTTS(text, lang);
        }
    },

    async useGoogleTTS(text, lang, apiKey) {
        const voiceMap = {
            'en-US': 'en-US-Neural2-C',
            'en-GB': 'en-GB-Neural2-B',
            'en-IN': 'en-IN-Neural2-B',
            'hi-IN': 'hi-IN-Neural2-A'
        };

        const voice = voiceMap[lang] || voiceMap['en-US'];

        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode: lang,
                        name: voice
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: this.voiceSpeed
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error('Google TTS API error');
        }

        const data = await response.json();
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play();
    },

    useBrowserTTS(text, lang) {
        if (!('speechSynthesis' in window)) {
            console.error('Browser TTS not supported');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = this.voiceSpeed;
        
        // Get best available voice for language
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        window.speechSynthesis.speak(utterance);
    },

    stopSpeaking() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

const AutomationModule = {
    workflows: [],

    init() {
        const automationBtn = document.getElementById('automationBtn');
        if (automationBtn) {
            automationBtn.addEventListener('click', () => this.openAutomationModal());
        }
        
        const closeAutomationModal = document.getElementById('closeAutomationModal');
        if (closeAutomationModal) {
            closeAutomationModal.addEventListener('click', () => this.closeAutomationModal());
        }
        
        document.querySelectorAll('.automation-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAutomation(action);
            });
        });

        this.loadAutomationSettings();
    },

    loadAutomationSettings() {
        const settings = {
            autoSummarize: 'autoSummarize',
            autoExtractItems: 'autoExtractItems',
            autoTags: 'autoTags',
            enableExports: 'enableExports',
            enableBatchMode: 'enableBatchMode',
            enableCompare: 'enableCompare',
            autoRoute: 'autoRoute'
        };
        
        Object.entries(settings).forEach(([key, storageKey]) => {
            const el = document.getElementById(key);
            if (el) {
                el.checked = localStorage.getItem(storageKey) !== 'false';
            }
        });
    },

    openAutomationModal() {
        document.getElementById('automationModal').classList.add('active');
    },

    closeAutomationModal() {
        document.getElementById('automationModal').classList.remove('active');
    },

    async executeAutomation(action) {
        const conversation = this.getConversationMessages();
        if (!conversation || conversation.length === 0) {
            alert('No conversation to automate. Start chatting first!');
            return;
        }

        this.closeAutomationModal();

        switch (action) {
            case 'summarize':
                await this.autoSummarize(conversation);
                break;
            case 'extract-items':
                await this.extractActionItems(conversation);
                break;
            case 'blog':
                await this.generateBlogPost(conversation);
                break;
            case 'email':
                await this.generateEmail(conversation);
                break;
            case 'social':
                await this.generateSocialMedia(conversation);
                break;
            case 'compare':
                await this.compareModels(conversation);
                break;
        }
    },

    getConversationMessages() {
        const messagesDiv = document.getElementById('messages');
        const messages = [];
        
        messagesDiv.querySelectorAll('.message').forEach(msg => {
            const isUser = msg.classList.contains('user');
            const content = msg.querySelector('.message-text')?.innerText || '';
            if (content) {
                messages.push({
                    role: isUser ? 'user' : 'assistant',
                    content
                });
            }
        });

        return messages;
    },

    async autoSummarize(conversation) {
        const prompt = `Summarize the following conversation in 3-4 sentences:\n\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
        const result = await App.sendAutomationMessage(prompt, 'summarize');
        this.showAutomationResult('📝 Summary', result);
    },

    async extractActionItems(conversation) {
        const prompt = `Extract all action items and tasks from this conversation:\n\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}\n\nReturn as a numbered list.`;
        const result = await App.sendAutomationMessage(prompt, 'extract-items');
        this.showAutomationResult('✅ Action Items', result);
    },

    async generateBlogPost(conversation) {
        const prompt = `Convert this conversation into a professional blog post with title, introduction, main sections, and conclusion:\n\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
        const result = await App.sendAutomationMessage(prompt, 'blog');
        this.showAutomationResult('📄 Blog Post', result);
        this.offerExport(result, 'blog-post.md');
    },

    async generateEmail(conversation) {
        const prompt = `Convert this conversation into a professional business email:\n\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
        const result = await App.sendAutomationMessage(prompt, 'email');
        this.showAutomationResult('✉️ Email', result);
        this.offerExport(result, 'email.txt');
    },

    async generateSocialMedia(conversation) {
        const prompt = `Create social media content from this conversation:\n- Twitter (280 chars)\n- LinkedIn (300 chars)\n- Instagram caption (150 chars)\n\nConversation:\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
        const result = await App.sendAutomationMessage(prompt, 'social');
        this.showAutomationResult('📱 Social Media', result);
    },

    async compareModels(conversation) {
        const topic = conversation[conversation.length - 1]?.content || 'latest message';
        const models = ['llama-3.3-70b-versatile', 'gpt-4o', 'claude-3-5-sonnet-20241022'];
        
        const results = [];
        for (const model of models) {
            const response = await App.sendAutomationMessage(`Based on our conversation, here's your perspective: ${topic}. Respond briefly.`, model);
            results.push({ model, response });
        }

        this.showComparisonResults(results);
    },

    showAutomationResult(title, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${title}</span>
                </div>
                <div class="message-text">${this.formatMarkdown(content)}</div>
                <div class="message-actions">
                    <button class="message-action" onclick="VoiceModule.speakText('${content.replace(/'/g, "\\'")}')">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        </svg>
                        Speak
                    </button>
                    <button class="message-action" onclick="navigator.clipboard.writeText('${content.replace(/'/g, "\\'")}')">
                        📋 Copy
                    </button>
                </div>
            </div>
        `;
        document.getElementById('messages').appendChild(messageDiv);
    },

    showComparisonResults(results) {
        const html = results.map(r => `
            <strong>${r.model}</strong>
            ${this.formatMarkdown(r.response)}
        `).join('<hr>');
        
        this.showAutomationResult('⚖️ Model Comparison', html);
    },

    offerExport(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    formatMarkdown(content) {
        return marked(content || '');
    }
};

const BrandingModule = {
    init() {
        this.loadBrandingSettings();
        this.setupTabSwitching();
        
        const brandColorEl = document.getElementById('brandColor');
        if (brandColorEl) {
            brandColorEl.addEventListener('change', (e) => {
                this.updateBrandColor(e.target.value);
            });
        }
        
        const brandNameEl = document.getElementById('brandName');
        if (brandNameEl) {
            brandNameEl.addEventListener('change', (e) => {
                this.updateBrandName(e.target.value);
            });
        }

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });

        const uploadLogoBtn = document.getElementById('uploadLogo');
        if (uploadLogoBtn) {
            uploadLogoBtn.addEventListener('click', () => {
                document.getElementById('logoInput').click();
            });
        }

        const uploadFaviconBtn = document.getElementById('uploadFavicon');
        if (uploadFaviconBtn) {
            uploadFaviconBtn.addEventListener('click', () => {
                document.getElementById('faviconInput').click();
            });
        }

        const logoInput = document.getElementById('logoInput');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }
        
        const faviconInput = document.getElementById('faviconInput');
        if (faviconInput) {
            faviconInput.addEventListener('change', (e) => this.handleFaviconUpload(e));
        }
    },

    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabBtn = e.currentTarget; // Use currentTarget instead of target
                const tabName = tabBtn.dataset.tab;
                
                if (!tabName) return; // Safety check
                
                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // Remove active from all buttons
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Show selected tab
                const tabContent = document.getElementById(`${tabName}-tab`);
                if (tabContent) {
                    tabContent.classList.add('active');
                    tabBtn.classList.add('active');
                }
            });
        });
    },

    loadBrandingSettings() {
        const brandName = localStorage.getItem('brandName') || 'Ominus';
        const brandColor = localStorage.getItem('brandColor') || '#d97706';
        const theme = localStorage.getItem('theme') || 'dark';

        const brandNameEl = document.getElementById('brandName');
        if (brandNameEl) brandNameEl.value = brandName;
        
        const brandColorEl = document.getElementById('brandColor');
        if (brandColorEl) brandColorEl.value = brandColor;
        
        const themeEl = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeEl) themeEl.checked = true;

        this.updateBrandName(brandName);
        this.updateBrandColor(brandColor);
        this.setTheme(theme);
    },

    updateBrandName(name) {
        document.querySelectorAll('.logo-text').forEach(el => el.textContent = name);
        localStorage.setItem('brandName', name);
    },

    updateBrandColor(color) {
        document.documentElement.style.setProperty('--accent-primary', color);
        document.documentElement.style.setProperty('--accent-hover', this.lightenColor(color, 20));
        document.getElementById('brandColorValue').textContent = color;
        localStorage.setItem('brandColor', color);
    },

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    setTheme(theme) {
        const html = document.documentElement;
        if (theme === 'light') {
            html.style.setProperty('--bg-primary', '#ffffff');
            html.style.setProperty('--bg-secondary', '#f5f5f5');
            html.style.setProperty('--text-primary', '#1a1a1a');
            html.style.setProperty('--text-secondary', '#666666');
        } else if (theme === 'dark') {
            html.style.setProperty('--bg-primary', '#0d0d0d');
            html.style.setProperty('--bg-secondary', '#1a1a1a');
            html.style.setProperty('--text-primary', '#fafafa');
            html.style.setProperty('--text-secondary', '#a3a3a3');
        }
        localStorage.setItem('theme', theme);
    },

    handleLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localStorage.setItem('brandLogo', event.target.result);
                // Update logo in UI
                const logoPreview = document.getElementById('logoPreview');
                logoPreview.innerHTML = `<img src="${event.target.result}" style="max-width: 100px; height: auto;">`;
            };
            reader.readAsDataURL(file);
        }
    },

    handleFaviconUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localStorage.setItem('brandFavicon', event.target.result);
                // Update favicon
                const link = document.querySelector('link[rel="icon"]');
                link.href = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
};

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    VoiceModule.init();
    AutomationModule.init();
    BrandingModule.init();
});
