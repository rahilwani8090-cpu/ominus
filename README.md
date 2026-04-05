# Ominus AI - The Game-Changing AI Assistant 🚀

A beautiful, Claude-like AI chat application with **multi-provider support**, **voice capabilities** (English & Hindi with real human voices), and **enterprise automation features**. Works as a standalone client-side web app (perfect for GitHub Pages) or with a Rust backend.

## 🎉 What's New (Game-Changing Updates!)

### 🎤 Voice Support
- **Speech-to-Text**: English (US/UK) & हिंदी (Hindi) voice input
- **Text-to-Speech**: Real human voices (not robotic) with speed control
- **Push-to-Talk**: Hold and speak, releases automatically
- **Auto-Read**: AI responses read aloud automatically
- **Google Cloud TTS**: Optional premium natural voices

### ⚙️ Automation Features
- **Auto-Summarize**: Generate executive summaries in seconds
- **Extract Tasks**: Pull action items automatically
- **Content Generation**: Blog posts, emails, social media, PDFs
- **Multi-Model Compare**: See responses from 3+ AI models
- **Smart Workflows**: Batch processing, scheduling, triggers
- **Knowledge Management**: Auto-tagging, search, cross-references

### 🎨 Brand & Customize
- **Custom Name**: Replace "Ominus" with your brand
- **Custom Colors**: Pick your primary brand color
- **Logo Upload**: Add company logo and favicon
- **Theme Control**: Light/Dark/Auto modes
- **White-Label Ready**: Share branded links with team

## Core Features

- 🤖 **Multi-Provider Support**: Groq, Google Gemini, OpenAI, Anthropic Claude, xAI Grok
- ⚡ **Latest AI Models**: Llama 4, Gemini 3.1, GPT-4o, Claude 3.5, Grok-2
- 💬 **Real-time Streaming**: Instant streaming responses
- 📝 **Markdown Support**: Full markdown with code syntax highlighting
- 📎 **File Attachments**: Upload and attach files to conversations
- 💾 **Conversation History**: Automatic saving to browser localStorage
- 🎤 **Voice I/O**: Speak in English/Hindi, get voice responses
- 📄 **Export Everything**: Blog posts, emails, PDFs, social media
- 🔧 **Custom Models**: Add any model via Settings
- 🔒 **Privacy First**: API keys stored locally, never on servers

## Tech Stack

- **Backend**: Rust, Axum, Tokio (optional)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Voice**: Web Speech API + Google Cloud TTS
- **APIs**: Google Gemini, Groq, OpenAI, Anthropic, xAI
- **Libraries**: Marked.js, Highlight.js

## Quick Start (5 Minutes)

### 1. Open in Browser
```bash
# Option 1: Simple HTTP server
python -m http.server 8000

# Option 2: Live server (VS Code)
# Install Live Server extension and click "Go Live"

# Option 3: Direct file
# Open index.html directly in your browser
```

Visit `http://localhost:8000`

### 2. Start Chatting
- Groq is pre-configured - just start typing!
- Select model from sidebar
- Press Enter to send

### 3. Try Voice (Optional)
- Click 🎤 microphone button
- Speak in English or हिंदी
- Message auto-populates

### 4. Try Automation
- Have a conversation
- Click ⚙️ "Automate" button
- Choose: Summary, Tasks, Blog, Email, Social

### 5. Customize Brand
- Settings → Branding
- Pick color, name, logo
- Changes apply instantly!

## Installation

### Clone Repository
```bash
git clone https://github.com/yourusername/ominus.git
cd ominus
```

### Add API Keys (Optional)
1. Open `index.html` in browser
2. Click Settings ⚙️
3. Go to "API Keys" tab
4. Add your keys (or skip - Groq works free!)

## Getting API Keys

| Service | Link | Cost |
|---------|------|------|
| **Groq** (Default) | [Console](https://console.groq.com/keys) | FREE ✅ |
| **Gemini** | [AI Studio](https://makersuite.google.com/app/apikey) | Free tier |
| **OpenAI** | [Platform](https://platform.openai.com/api-keys) | Paid |
| **Anthropic Claude** | [Console](https://console.anthropic.com/settings/keys) | Paid |
| **xAI Grok** | [Console](https://console.x.ai) | Paid |
| **Google TTS** (Optional) | [Cloud Console](https://cloud.google.com/text-to-speech) | Free tier |

## Features in Detail

### 🎤 Voice Features
- Speech-to-Text in English & Hindi
- Natural text-to-speech voices
- Speed control (0.5x to 2x)
- Auto-play responses
- Browser & cloud TTS options

### ⚙️ Automation Features
- **Auto-Summarize**: 3-4 sentence conversation recap
- **Extract Tasks**: Pull action items automatically
- **Blog Post**: Convert chat to full article
- **Email Template**: Professional email generation
- **Social Media**: Twitter, LinkedIn, Instagram posts
- **Compare Models**: See 3 different AI responses
- **Batch Processing**: Handle multiple prompts
- **Auto-Tags**: Smart conversation categorization
- **Search**: Full-text search across conversations

### 🎨 Branding Features
- **Custom Name**: Any company/brand name
- **Color Picker**: Choose primary brand color
- **Logo Upload**: Company logo
- **Favicon Upload**: Browser tab icon
- **Theme**: Light/Dark/Auto
- **Persistent**: All saved to browser

### Settings Tabs
1. **🔑 API Keys** - Add all provider keys
2. **🎤 Voice** - Configure voice input/output
3. **⚙️ Automation** - Enable/disable features
4. **🎨 Branding** - Customize appearance

## Architecture

```
ominus/
├── index.html              # Main HTML (tabbed settings)
├── style.css               # Complete styling
├── app.js                  # Core chat logic
├── voice-automation.js     # Voice, automation, branding
├── FEATURES.md             # Feature documentation
├── README.md               # This file
└── target/                 # Rust build (optional)
```

## Supported Models

| Provider | Models | Status |
|----------|--------|--------|
| **Groq** | Llama 3.3/4, GPT OSS, Qwen3, Mixtral, Gemma | ✅ Default |
| **Gemini** | 2.5 Flash, 3.1 Flash, Pro | ✅ Works |
| **OpenAI** | GPT-4o, o1, o3-mini | ✅ Works |
| **Claude** | 3.5 Sonnet, 3 Opus, Haiku | ✅ Works |
| **Grok** | Grok-2, Beta | ✅ Works |
| **Custom** | Any model | ✅ Add custom |

## Privacy & Security

✅ All data stored locally in browser  
✅ No server-side storage of conversations  
✅ API keys only sent to respective providers  
✅ No tracking or analytics  
✅ MIT licensed, fully open source  
✅ Audit the code yourself  

## Deployment

### GitHub Pages (Recommended for Frontend)

1. Push to GitHub
2. Settings → Pages
3. Deploy from `main` branch or `gh-pages` branch
4. Auto-deployed via GitHub Actions

### Render (for Backend)

1. Connect GitHub repo
2. Use `render.yaml` blueprint
3. Add environment variables
4. Auto-deployed

### Local Development

```bash
# Python HTTP server
python -m http.server 8000

# Node.js HTTP server
npx http-server

# VS Code Live Server
# Install extension & click "Go Live"
```

## Use Cases

### For Developers
Chat about code → Extract tasks → Email to team ✅

### For Content Creators
Conversation → Blog post → Social posts ✅

### For Sales
Meeting notes → Summary → Email → CRM ✅

### For Managers
Brainstorm → Compare models → Action items ✅

### Multilingual Teams
English chat → Hindi voice responses ✅

## FAQ

**Q: Do I need API keys?**  
A: No! Groq is pre-configured. Open and chat.

**Q: Is my data safe?**  
A: Yes! Everything stays in your browser.

**Q: Can I customize it?**  
A: Yes! Brand name, colors, logo, everything.

**Q: Does voice work offline?**  
A: Input yes (browser), output partially (browser TTS).

**Q: MIT licensed?**  
A: Yes! Use for anything, commercial included.

**Q: Can I use for my company?**  
A: Yes! White-label ready.

## Roadmap

- [ ] Team collaboration
- [ ] Usage analytics
- [ ] Plugin system
- [ ] Keyboard shortcuts
- [ ] Mobile app
- [ ] Claude integration
- [ ] Conversation branching

## Contributing

- Fork the repo
- Create feature branch
- Submit PR
- All contributions welcome!

## Support

- Open issues on GitHub
- Request features
- Report bugs
- Join discussions

## Acknowledgments

- UI inspired by [Claude](https://claude.ai)
- Powered by [Groq](https://groq.com), [Gemini](https://ai.google.dev), [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [xAI](https://x.ai)
- Built with ❤️ by Ominus AI

## License

MIT License - Free for personal & commercial use

---

## 🚀 Next Steps

1. **Clone**: `git clone [repo] && cd ominus`
2. **Open**: Visit `http://localhost:8000` (or open `index.html` directly)
3. **Chat**: Start with default Llama model
4. **Customize**: Settings → Branding (pick colors & logo)
5. **Automate**: Click "Automate" → Try a workflow
6. **Voice**: Click 🎤 → Speak English or Hindi
7. **Share**: Send branded link to team

**Ready to transform conversations into action? Let's go! 🎉**
