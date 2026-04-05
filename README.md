# Ominus AI

A beautiful, Claude-like AI chat application with **multi-provider support**. Works as a standalone client-side web app (perfect for GitHub Pages) or with a Rust backend.

## Features

- 🤖 **Multi-Provider Support**: Groq, Google Gemini, OpenAI, Anthropic Claude, xAI Grok
- ⚡ **Latest AI Models**: Llama 4, Gemini 2.5/3.1, GPT-4o, Claude 3.5, Grok-2, GPT OSS, Qwen3
- 💬 **Real-time Streaming**: Instant streaming responses
- 📝 **Markdown Support**: Full markdown with code syntax highlighting
- 📎 **File Attachments**: Upload and attach files to conversations
- 💾 **Conversation History**: Automatic saving to browser localStorage
- 🔧 **Custom Models**: Add any model via Settings
- 🔒 **Privacy First**: API keys stored locally, never on servers

## Tech Stack

- **Backend**: Rust, Axum, Tokio
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **APIs**: Google Gemini, Groq
- **Libraries**: Marked.js, Highlight.js

## Getting Started

### Prerequisites

- Rust (latest stable version)
- API keys for Gemini and/or Groq

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ominus.git
cd ominus
```

2. Set up environment variables:
```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:GROQ_API_KEY="your-groq-api-key"

# Or create a .env file
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

3. Build and run:
```bash
cargo run --release
```

4. Open your browser and navigate to `http://localhost:3000`

### Getting API Keys

- **Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Groq**: Get your API key from [Groq Console](https://console.groq.com/keys)

## Usage

- Select your preferred model from the dropdown in the sidebar
- Type your message and press Enter or click the send button
- Attach files using the paperclip icon
- Copy code blocks using the copy button
- Regenerate responses using the regenerate button

## Architecture

```
ominus/
├── src/
│   ├── main.rs       # Axum server and routes
│   ├── api.rs        # Gemini and Groq API clients
│   ├── models.rs     # Data structures
│   └── storage.rs    # Conversation persistence
├── static/
│   ├── index.html    # Main HTML
│   ├── style.css     # Claude-like styling
│   └── app.js        # Frontend application
└── Cargo.toml
```

## Supported Providers & Models

| Provider | Models |
|----------|--------|
| **Groq** | Llama 3.3 70B, Llama 4 Scout, GPT OSS 120B, Qwen3 32B, Mixtral 8x7B, Gemma 2 9B |
| **Gemini** | 2.5 Flash, 2.5 Flash-Lite, 2.5 Pro, 3.1 Flash |
| **OpenAI** | GPT-4o, GPT-4o Mini, o1, o3-mini |
| **Claude** | 3.5 Sonnet, 3 Opus, 3 Haiku |
| **Grok** | Grok-2, Grok-2 Latest, Grok Beta |
| **Custom** | Add any model via Settings UI

## License

MIT License - See LICENSE file for details

## GitHub Deployment

### Option 1: Deploy Frontend to GitHub Pages + Backend to Render

1. **Fork/Create repository** on GitHub at `https://github.com/rahilwani8090-cpu/ominus`

2. **Push your code:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/rahilwani8090-cpu/ominus.git
git push -u origin main
```

3. **Enable GitHub Pages:**
   - Go to Settings > Pages
   - Source: GitHub Actions
   - The `.github/workflows/pages.yml` will auto-deploy the frontend

4. **Deploy backend to Render:**
   - Go to [render.com](https://render.com)
   - Click "New Web Service"
   - Connect your GitHub repo
   - Use the `render.yaml` blueprint
   - Add environment variables:
     - `GEMINI_API_KEY`
     - `GROQ_API_KEY`

### Option 2: Deploy Everything to Render

1. Push code to GitHub
2. Connect repo to Render
3. Both frontend and backend served from same service

### Option 3: Client-Only Mode (GitHub Pages Only)

For a version that works entirely in the browser with user-provided API keys, use the `gh-pages` branch structure in the workflow file.

## Environment Variables for Production

Set these in your hosting platform:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GROQ_API_KEY` | Groq API key |
| `RUST_LOG` | Set to `info` for logging |

## Acknowledgments

- UI inspired by [Claude](https://claude.ai)
- Powered by [Gemini](https://ai.google.dev) and [Groq](https://groq.com)
