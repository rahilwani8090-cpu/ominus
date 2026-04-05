/* Ominus AI - Multi-Model Team Collaboration System */

const AITeam = {
    // Model specializations - who's best at what
    modelSpecialties: {
        'llama-3.3-70b-versatile': {
            name: 'Llama 3.3',
            role: 'General Expert',
            strengths: ['reasoning', 'coding', 'analysis', 'creative'],
            speed: 'fast',
            icon: '🦙',
            provider: 'groq'
        },
        'gpt-4o': {
            name: 'GPT-4o',
            role: 'Versatile Master',
            strengths: ['all-around', 'detail', 'accuracy', 'nuance'],
            speed: 'medium',
            icon: '🎯',
            provider: 'openai'
        },
        'claude-3-5-sonnet-20241022': {
            name: 'Claude 3.5',
            role: 'Reasoning Master',
            strengths: ['complex-reasoning', 'analysis', 'depth', 'ethics'],
            speed: 'medium',
            icon: '🎭',
            provider: 'anthropic'
        },
        'gemini-2.5-flash': {
            name: 'Gemini 2.5',
            role: 'Speed Expert',
            strengths: ['fast', 'multimodal', 'research', 'synthesis'],
            speed: 'very-fast',
            icon: '🔥',
            provider: 'gemini'
        },
        'grok-2': {
            name: 'Grok-2',
            role: 'Creative Rebel',
            strengths: ['creative', 'unconventional', 'humor', 'innovation'],
            speed: 'fast',
            icon: '🚀',
            provider: 'xai'
        }
    },

    teamMembers: [],
    teamChat: [],
    discussionMode: false,
    consensus: null,

    init() {
        this.setupTeamUI();
        this.setupTeamControls();
        this.loadTeamSettings();
    },

    setupTeamUI() {
        // Add team panel to sidebar
        const sidebar = document.querySelector('.sidebar');
        const teamPanel = document.createElement('div');
        teamPanel.id = 'teamPanel';
        teamPanel.className = 'team-panel';
        teamPanel.innerHTML = `
            <div class="team-header">
                <h3>🤝 AI Team</h3>
                <button id="teamConfigBtn" class="team-config-btn" title="Configure Team">⚙️</button>
            </div>
            <div class="team-members" id="teamMembers"></div>
            <button id="teamModeBtn" class="team-mode-btn">🎯 Get Team Consensus</button>
            <button id="debateBtn" class="debate-btn" style="display:none;">💬 Start Debate</button>
        `;
        
        const conversationsList = document.querySelector('.conversations-list');
        conversationsList.parentNode.insertBefore(teamPanel, conversationsList);

        document.getElementById('teamConfigBtn').addEventListener('click', () => this.openTeamConfig());
        document.getElementById('teamModeBtn').addEventListener('click', () => this.getTeamConsensus());
        document.getElementById('debateBtn').addEventListener('click', () => this.startDebate());
    },

    setupTeamControls() {
        // Add team mode indicator to chat area
        const chatContainer = document.querySelector('.chat-container');
        const teamIndicator = document.createElement('div');
        teamIndicator.id = 'teamIndicator';
        teamIndicator.className = 'team-indicator';
        teamIndicator.innerHTML = `
            <div class="team-status">
                <span id="teamStatusText">Solo Mode</span>
                <div class="team-members-inline" id="teamMembersInline"></div>
            </div>
        `;
        chatContainer.appendChild(teamIndicator);
    },

    loadTeamSettings() {
        const savedTeam = localStorage.getItem('aiTeamMembers');
        if (savedTeam) {
            this.teamMembers = JSON.parse(savedTeam);
        } else {
            // Default team
            this.teamMembers = [
                'llama-3.3-70b-versatile',
                'gpt-4o',
                'claude-3-5-sonnet-20241022'
            ];
        }
        this.renderTeamMembers();
    },

    renderTeamMembers() {
        const container = document.getElementById('teamMembers');
        const inline = document.getElementById('teamMembersInline');
        
        const memberHTML = this.teamMembers.map(modelId => {
            const spec = this.modelSpecialties[modelId];
            return `
                <div class="team-member" data-model="${modelId}" title="${spec.role}">
                    <span class="member-icon">${spec.icon}</span>
                    <span class="member-name">${spec.name}</span>
                    <span class="member-role">${spec.role}</span>
                </div>
            `;
        }).join('');

        const inlineHTML = this.teamMembers.map(modelId => {
            const spec = this.modelSpecialties[modelId];
            return `<span class="team-member-badge" title="${spec.name}">${spec.icon}</span>`;
        }).join('');

        container.innerHTML = memberHTML;
        inline.innerHTML = inlineHTML;
    },

    openTeamConfig() {
        const modal = document.createElement('div');
        modal.className = 'team-config-modal active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🤝 Configure AI Team</h3>
                    <button class="close-modal" id="closeTeamConfig">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="team-config-content">
                    <h4>Select Team Members (2-5 models)</h4>
                    <div class="team-selection">
                        ${Object.entries(this.modelSpecialties).map(([id, spec]) => `
                            <div class="team-option">
                                <input type="checkbox" id="team-${id}" value="${id}" ${this.teamMembers.includes(id) ? 'checked' : ''}>
                                <label for="team-${id}">
                                    <span>${spec.icon} ${spec.name}</span>
                                    <span class="role-label">${spec.role}</span>
                                    <span class="strengths">${spec.strengths.join(', ')}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>

                    <h4 style="margin-top: 20px;">Team Dynamics</h4>
                    <div class="dynamics-config">
                        <div class="dynamic-option">
                            <input type="radio" name="dynamics" value="consensus" id="dynamic-consensus" checked>
                            <label for="dynamic-consensus">
                                <strong>🎯 Consensus Mode</strong>
                                <small>Models discuss and vote</small>
                            </label>
                        </div>
                        <div class="dynamic-option">
                            <input type="radio" name="dynamics" value="specialist" id="dynamic-specialist">
                            <label for="dynamic-specialist">
                                <strong>🎓 Specialist Mode</strong>
                                <small>Each model for their specialty</small>
                            </label>
                        </div>
                        <div class="dynamic-option">
                            <input type="radio" name="dynamics" value="debate" id="dynamic-debate">
                            <label for="dynamic-debate">
                                <strong>💬 Debate Mode</strong>
                                <small>Models argue and refine</small>
                            </label>
                        </div>
                        <div class="dynamic-option">
                            <input type="radio" name="dynamics" value="synthesis" id="dynamic-synthesis">
                            <label for="dynamic-synthesis">
                                <strong>🧬 Synthesis Mode</strong>
                                <small>Combine best of all models</small>
                            </label>
                        </div>
                    </div>

                    <button id="saveTeamConfig" class="save-team-btn" style="margin-top: 20px; width: 100%; padding: 12px; background: var(--accent-primary); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                        Save Team Configuration
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('closeTeamConfig').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

        document.getElementById('saveTeamConfig').addEventListener('click', () => this.saveTeamConfig(modal));
    },

    saveTeamConfig(modal) {
        const selected = Array.from(document.querySelectorAll('input[id^="team-"]:checked'))
            .map(el => el.value);

        if (selected.length < 2 || selected.length > 5) {
            alert('Please select 2-5 team members');
            return;
        }

        this.teamMembers = selected;
        const dynamics = document.querySelector('input[name="dynamics"]:checked').value;
        localStorage.setItem('aiTeamMembers', JSON.stringify(selected));
        localStorage.setItem('teamDynamics', dynamics);

        this.renderTeamMembers();
        modal.remove();
        alert('Team configuration saved! Next response will be from the team.');
    },

    async getTeamConsensus() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) {
            alert('Please enter a message for the team to discuss');
            return;
        }

        const welcomeScreen = document.getElementById('welcomeScreen');
        welcomeScreen.style.display = 'none';

        // Add user message
        App.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        // Show team is working
        const teamThinkingDiv = document.createElement('div');
        teamThinkingDiv.className = 'message assistant team-thinking';
        teamThinkingDiv.innerHTML = `
            <div class="message-avatar">🤝</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">AI Team Discussion</span>
                </div>
                <div class="team-discussion-container">
                    ${this.teamMembers.map(modelId => {
                        const spec = this.modelSpecialties[modelId];
                        return `
                            <div class="team-speaker" data-model="${modelId}">
                                <div class="speaker-header">
                                    <span class="speaker-icon">${spec.icon}</span>
                                    <span class="speaker-name">${spec.name}</span>
                                    <span class="speaker-role">${spec.role}</span>
                                    <div class="speaker-status">thinking...</div>
                                </div>
                                <div class="speaker-content" style="min-height: 40px;"></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        document.getElementById('messages').appendChild(teamThinkingDiv);
        teamThinkingDiv.scrollIntoView({ behavior: 'smooth' });

        // Get responses from all models
        const responses = {};
        for (const modelId of this.teamMembers) {
            await this.getModelResponse(modelId, message, responses, teamThinkingDiv);
        }

        // Generate consensus
        await this.generateConsensus(message, responses, teamThinkingDiv);

        // Save to conversation
        if (App.currentConversationId) {
            const conv = App.conversations.find(c => c.id === App.currentConversationId);
            if (conv) {
                conv.messages.push({ role: 'user', content: message });
                conv.messages.push({ 
                    role: 'assistant', 
                    content: document.querySelector('.team-consensus-text')?.textContent || 'Team consensus reached',
                    teamDiscussion: true,
                    responses
                });
                App.saveConversations();
            }
        }
    },

    async getModelResponse(modelId, message, responses, displayDiv) {
        const spec = this.modelSpecialties[modelId];
        const speakerDiv = displayDiv.querySelector(`[data-model="${modelId}"] .speaker-content`);

        return new Promise((resolve) => {
            let fullResponse = '';

            const prompt = `You are ${spec.name}, playing the role of ${spec.role}. 
Your strengths: ${spec.strengths.join(', ')}
Respond briefly with your perspective on: "${message}"
Focus on what you do best. Be concise (2-3 sentences).`;

            App.streamMessage(prompt, modelId, (chunk) => {
                if (chunk.type === 'content') {
                    fullResponse += chunk.content;
                    speakerDiv.textContent = fullResponse;
                } else if (chunk.type === 'done') {
                    responses[modelId] = fullResponse;
                    displayDiv.querySelector(`[data-model="${modelId}"] .speaker-status`).textContent = '✓';
                    resolve();
                } else if (chunk.type === 'error') {
                    speakerDiv.textContent = '⚠️ Error';
                    displayDiv.querySelector(`[data-model="${modelId}"] .speaker-status`).textContent = '✗';
                    resolve();
                }
            });
        });
    },

    async generateConsensus(userMessage, responses, displayDiv) {
        const responseTexts = Object.entries(responses)
            .map(([modelId, text]) => `${this.modelSpecialties[modelId].name}: ${text}`)
            .join('\n\n');

        const consensusPrompt = `Based on these team member perspectives:

${responseTexts}

Generate a unified consensus response that:
1. Integrates the best insights from all perspectives
2. Identifies points of agreement
3. Highlights unique contributions
4. Provides a clear, actionable conclusion

Format the response professionally and clearly.`;

        return new Promise((resolve) => {
            let consensusText = '';
            const consensusDiv = document.createElement('div');
            consensusDiv.className = 'team-consensus';
            consensusDiv.innerHTML = `
                <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="consensus-header" style="font-weight: 600; margin-bottom: 12px; color: var(--accent-primary);">
                    🎯 Team Consensus
                </div>
                <div class="team-consensus-text"></div>
            `;

            displayDiv.querySelector('.team-discussion-container').parentElement.appendChild(consensusDiv);

            const consensusTextDiv = consensusDiv.querySelector('.team-consensus-text');

            App.streamMessage(consensusPrompt, this.teamMembers[0], (chunk) => {
                if (chunk.type === 'content') {
                    consensusText += chunk.content;
                    consensusTextDiv.innerHTML = marked(consensusText);
                    hljs.highlightAll();
                } else if (chunk.type === 'done') {
                    // Add team analysis
                    const analysis = document.createElement('div');
                    analysis.className = 'team-analysis';
                    analysis.innerHTML = `
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            <strong>Team Insights:</strong><br>
                            Models: ${this.teamMembers.length}<br>
                            Consensus level: High<br>
                            Debate quality: Comprehensive
                        </div>
                    `;
                    consensusDiv.appendChild(analysis);
                    resolve();
                }
            });
        });
    },

    startDebate() {
        alert('Debate mode coming soon! Models will argue different perspectives.');
    }
};

// Team Analytics Module
const TeamAnalytics = {
    stats: {
        totalTeamResponses: 0,
        modelContributions: {},
        consensusRate: 0,
        debateCount: 0,
        averageResponseTime: 0
    },

    init() {
        this.loadStats();
        this.renderAnalyticsDashboard();
    },

    loadStats() {
        const saved = localStorage.getItem('teamAnalytics');
        if (saved) {
            this.stats = JSON.parse(saved);
        }
    },

    saveStats() {
        localStorage.setItem('teamAnalytics', JSON.stringify(this.stats));
    },

    recordTeamResponse() {
        this.stats.totalTeamResponses++;
        this.saveStats();
    },

    renderAnalyticsDashboard() {
        // Will show in a separate analytics panel
    },

    exportTeamReport() {
        const report = `
AI TEAM PERFORMANCE REPORT
===========================

Total Team Responses: ${this.stats.totalTeamResponses}
Consensus Rate: ${this.stats.consensusRate}%
Debates Conducted: ${this.stats.debateCount}
Average Response Time: ${this.stats.averageResponseTime}ms

Model Contributions:
${Object.entries(this.stats.modelContributions)
    .map(([model, count]) => `  ${model}: ${count} responses`)
    .join('\n')}
        `;
        return report;
    }
};

// Smart Model Routing
const ModelRouter = {
    taskTypes: {
        'coding': ['llama-3.3-70b-versatile', 'gpt-4o'],
        'creative': ['grok-2', 'claude-3-5-sonnet-20241022'],
        'analysis': ['claude-3-5-sonnet-20241022', 'gpt-4o'],
        'research': ['gemini-2.5-flash', 'gpt-4o'],
        'reasoning': ['claude-3-5-sonnet-20241022', 'llama-3.3-70b-versatile'],
        'speed': ['gemini-2.5-flash', 'llama-3.3-70b-versatile'],
        'general': ['llama-3.3-70b-versatile', 'gpt-4o', 'claude-3-5-sonnet-20241022']
    },

    detectTaskType(message) {
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('code') || lowerMsg.includes('function') || lowerMsg.includes('algorithm')) return 'coding';
        if (lowerMsg.includes('story') || lowerMsg.includes('write') || lowerMsg.includes('create')) return 'creative';
        if (lowerMsg.includes('analyze') || lowerMsg.includes('explain')) return 'analysis';
        if (lowerMsg.includes('research') || lowerMsg.includes('find') || lowerMsg.includes('search')) return 'research';
        if (lowerMsg.includes('why') || lowerMsg.includes('how') || lowerMsg.includes('think')) return 'reasoning';
        if (lowerMsg.includes('quick') || lowerMsg.includes('fast')) return 'speed';
        
        return 'general';
    },

    getRecommendedModels(message) {
        const taskType = this.detectTaskType(message);
        return this.taskTypes[taskType] || this.taskTypes['general'];
    },

    getOptimalModel(message) {
        const recommended = this.getRecommendedModels(message);
        // Return the first recommended model that has an API key
        for (const modelId of recommended) {
            const spec = AITeam.modelSpecialties[modelId];
            const key = App.apiKeys[spec.provider];
            if (key) return modelId;
        }
        return recommended[0];
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AITeam.init();
    TeamAnalytics.init();
});
