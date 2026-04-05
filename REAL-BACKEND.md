# OMNIUS AI Backend - Real AI Assistant

**OMNIUS** is a production-grade AI assistant system inspired by JARVIS from Iron Man. Unlike fake demo projects, this is REAL:

- ✅ **Real AI Models** - Groq (free), Ollama (local), HuggingFace (free)
- ✅ **Real Automation** - Email, Calendar, Tasks, Web Scraping, Code Execution
- ✅ **Real Voice** - Google Speech-to-Text, Text-to-Speech
- ✅ **Real Persistence** - SQLite database with complete schema
- ✅ **Real-Time** - WebSocket for live updates
- ✅ **Production Ready** - Error handling, logging, rate limiting

---

## Quick Start (5 minutes)

### 1. Prerequisites
```bash
# Required
Node.js 18+ 
npm 9+

# Optional but recommended (for local models)
Ollama - https://ollama.ai
```

### 2. Installation
```bash
# Clone repo
git clone https://github.com/rahilwani8090-cpu/ominus
cd ominus

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys (see below)
```

### 3. Get Free API Keys (2 minutes)

**Groq (Most Important - Required)**
1. Go to https://console.groq.com/keys
2. Sign up (free, no credit card)
3. Copy API key
4. Paste in `.env`: `GROQ_API_KEY=gsk_...`

**Google Cloud (Optional - for voice)**
1. Create project: https://console.cloud.google.com
2. Enable Speech-to-Text & Text-to-Speech APIs
3. Create service account and download JSON key
4. Set path in `.env`: `GOOGLE_CLOUD_KEY_FILE=./config/google-cloud-key.json`

**HuggingFace (Optional - for more models)**
1. Sign up: https://huggingface.co
2. Create API token: https://huggingface.co/settings/tokens
3. Paste in `.env`: `HUGGINGFACE_API_KEY=hf_...`

### 4. Start Development Server
```bash
# Terminal 1: Start Node.js backend
npm run dev

# Terminal 2 (optional): Start Ollama for local models
ollama serve
```

Server runs on `http://localhost:3000`

---

## Architecture

### Frontend
```
├── index.html          # Main UI
├── style.css           # Mobile-first responsive
└── app.js              # Frontend logic
```

### Backend
```
server/
├── index.js            # Express + Socket.IO
├── models/
│   └── AIModelRouter.js   # Multi-provider AI routing
├── automation/         # Real automation workflows
├── services/           # Business logic
├── utils/
│   └── database.js     # SQLite persistence
└── middleware/         # Auth, validation, etc.
```

---

## Real Features

### 1. AI Chat (Real Responses)
```javascript
// Query any model with automatic failover
const response = await AIModelRouter.route("Explain quantum computing", {
  taskType: 'education',
  temperature: 0.7,
  maxTokens: 2000
});
// Returns: { provider: 'groq', model: 'llama-3.3-70b', response: '...', usage: {...} }
```

**Supported Providers:**
- Groq (free: 500k tokens/day) - Fastest
- Ollama (free, local) - Privacy-first
- HuggingFace (free) - Diverse models

### 2. Real Voice I/O
```javascript
// Speech Recognition
const transcription = await VoiceService.transcribe(audioFile);
// Returns: { text: '...', confidence: 0.95, language: 'en' }

// Text-to-Speech
const audioBuffer = await VoiceService.synthesize('Hello world', {
  voice: 'natural-human',
  language: 'en'
});
```

### 3. Real Automations
```javascript
// Email automation
const automation = await AutomationEngine.create({
  name: 'Daily Newsletter',
  trigger: { type: 'schedule', cron: '0 9 * * *' },
  actions: [
    { type: 'email', to: 'user@example.com', subject: 'News' },
    { type: 'ai-summarize', prompt: 'Summarize news' }
  ]
});

// Calendar management
const event = await CalendarService.createEvent({
  title: 'AI Team Meeting',
  startTime: new Date(),
  duration: 60,
  attendees: ['team@company.com']
});
```

### 4. Real File Processing
```javascript
// PDF extraction
const text = await FileProcessor.extractPDF(pdfFile);

// Excel analysis
const data = await FileProcessor.readExcel(excelFile);

// Image OCR
const text = await FileProcessor.extractImageText(imageFile);
```

### 5. Real Data Persistence
```javascript
// All data stored in real database
const conversation = db.createConversation(userId, 'New Chat');
db.addMessage(conversationId, userId, 'user', 'Hello', 'groq', 145);

// Retrieve history
const messages = db.getConversationHistory(conversationId);
```

---

## Real API Endpoints

### Chat (Real AI)
```
POST /api/chat
Body: { conversationId, message }
Response: { response, model, tokens, timestamp }
```

### Voice (Real STT/TTS)
```
POST /api/voice/transcribe
Body: { audio }
Response: { text, confidence, language }

POST /api/voice/synthesize
Body: { text, voice, language }
Response: { audio, format, size }
```

### Automation (Real Workflows)
```
POST /api/automation/create
Body: { name, trigger, actions }
Response: { id, createdAt }

GET /api/automation/list
Response: { automations: [...], total }

POST /api/automation/execute/:id
Response: { taskId, status, result }
```

### Files (Real Processing)
```
POST /api/files/upload
Body: FormData with file
Response: { fileId, filename, size }

POST /api/files/process
Body: { fileId, action: 'extract', type: 'pdf' }
Response: { result }
```

---

## Environment Variables (.env)

### Required
```
GROQ_API_KEY=gsk_YOUR_KEY_HERE
```

### Optional but Recommended
```
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_KEY_FILE=./config/google-cloud-key.json
OLLAMA_BASE_URL=http://localhost:11434
HUGGINGFACE_API_KEY=hf_YOUR_KEY_HERE
```

### Server
```
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

See `.env.example` for complete list.

---

## Development Workflow

### Run Tests
```bash
npm test                    # All tests
npm run test:watch         # Watch mode
npm run test:e2e           # End-to-end tests
```

### Lint & Format
```bash
npm run lint               # Check code
npm run lint -- --fix      # Auto-fix issues
npm run format             # Format with prettier
```

### Database
```bash
npm run db:migrate         # Run migrations
npm run db:seed           # Seed with test data (TODO)
```

### Monitoring
```bash
# Check provider health
curl http://localhost:3000/api/health
```

---

## Production Deployment

### Docker
```bash
docker build -t omnius:latest .
docker run -p 3000:3000 --env-file .env omnius:latest
```

### Heroku
```bash
heroku create omnius-app
heroku config:set GROQ_API_KEY=gsk_...
git push heroku main
```

### Self-hosted
```bash
npm run build              # Build & test
npm start                  # Production server
```

---

## Real-World Examples

### Example 1: Daily Report Automation
```javascript
// Create automation that runs daily
const automation = await AutomationEngine.create({
  name: 'Daily AI Report',
  trigger: { 
    type: 'schedule',
    cron: '0 8 * * MON-FRI'  // 8 AM weekdays
  },
  actions: [
    {
      type: 'ai-generate',
      prompt: 'Generate today\'s news summary'
    },
    {
      type: 'email',
      to: 'boss@company.com',
      subject: 'Daily Report'
    },
    {
      type: 'slack-post',
      channel: '#daily-reports'
    }
  ]
});
```

### Example 2: Email Smart Filtering
```javascript
// Automatically categorize and respond
const automation = await AutomationEngine.create({
  name: 'Smart Email Filter',
  trigger: {
    type: 'email',
    conditions: {
      from: 'boss@company.com',
      contains: ['urgent', 'asap']
    }
  },
  actions: [
    {
      type: 'ai-respond',
      prompt: 'Generate professional acknowledgment',
      send: true
    },
    {
      type: 'notify',
      method: 'push'
    }
  ]
});
```

### Example 3: Code Analysis
```javascript
// Upload code, get AI analysis
const file = await FileProcessor.uploadCode(codeFile);
const analysis = await AIModelRouter.route(
  `Analyze this code for security issues: ${file.content}`,
  { taskType: 'code-review', model: 'powerful' }
);
console.log(analysis.response);  // Real security analysis
```

---

## Troubleshooting

### "No API key configured"
- Ensure `.env` file exists in project root
- Run: `cp .env.example .env`
- Add your Groq API key to `.env`

### "Groq not responding"
- Check internet connection
- Verify API key is correct
- Check Groq status: https://status.groq.com
- System will fallback to Ollama/HuggingFace automatically

### "Database error"
- Ensure `/data` directory exists: `mkdir data`
- Check database permissions
- Clear database: `rm data/omnius.db` (WARNING: deletes data)

### "Ollama not found"
- Install Ollama: https://ollama.ai
- Run: `ollama serve` in separate terminal
- Download model: `ollama pull llama2`

### "Voice not working"
- Install Google Cloud SDK
- Create service account JSON key
- Set `GOOGLE_CLOUD_KEY_FILE` in `.env`
- Test: `curl -X POST http://localhost:3000/api/voice/test`

---

## Technology Stack

**Backend:**
- Node.js 18+
- Express.js
- Socket.IO (real-time)
- SQLite (persistence)
- Docker (deployment)

**AI/ML:**
- Groq API (primary)
- Ollama (local models)
- HuggingFace (secondary)
- Google Cloud APIs

**Integrations:**
- Gmail/IMAP
- Google Calendar
- Slack
- GitHub
- Others via webhooks

---

## Contributing

We welcome contributions! This is REAL, open-source software.

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Make changes
4. Run tests: `npm test`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature/amazing`
7. Submit PR

---

## License

MIT - See LICENSE file

---

## Support

- 📖 Docs: See `DEVELOPMENT.md`
- 🐛 Issues: https://github.com/rahilwani8090-cpu/ominus/issues
- 💬 Discussions: https://github.com/rahilwani8090-cpu/ominus/discussions

---

## OMNIUS vs JARVIS

| Feature | OMNIUS | JARVIS |
|---------|--------|--------|
| Multi-Model AI | ✅ Yes | ✅ Implied |
| Real Automation | ✅ Yes | ✅ Yes |
| Voice I/O | ✅ Real | ✅ Real |
| Learning | 🔜 Planned | ✅ Yes |
| Integration | ✅ Extensible | ✅ Full |
| Self-Awareness | 🔜 Research | ✅ Implied |

**Status:** OMNIUS is production-ready AI assistant. JARVIS was fictional but inspired this.

---

## Next Steps

1. ✅ Get Groq API key (5 min)
2. ✅ Run `npm install` (3 min)
3. ✅ Set `.env` file (2 min)
4. ✅ Run `npm run dev` (1 min)
5. ✅ Open http://localhost:3000 in browser
6. 💬 Start chatting with REAL AI!

**Welcome to OMNIUS - The real JARVIS for everyone! 🤖✨**
