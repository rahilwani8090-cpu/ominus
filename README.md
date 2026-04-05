# Ominus AI

A beautiful, Claude-like AI chat application built with Rust and modern web technologies. Supports both Google Gemini and Groq APIs with real-time streaming responses.

## Features

- 🤖 **Multiple AI Models**: Support for Gemini 2.0 Flash, Gemini 2.0 Pro, Llama 3.3 70B, Mixtral 8x7B, and more
- ⚡ **Real-time Streaming**: WebSocket-based streaming for instant responses
- 💬 **Claude-like UI**: Beautiful dark theme interface inspired by Claude
- 📝 **Markdown Support**: Full markdown rendering with code syntax highlighting
- 📎 **File Attachments**: Upload and attach files to your conversations
- 💾 **Conversation History**: Automatic saving and management of chat history
- 🔒 **Privacy Focused**: Your data stays on your machine

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

## Available Models

### Google Gemini
- `gemini-2.0-flash` - Fast and versatile
- `gemini-2.0-flash-thinking-exp` - Experimental thinking model
- `gemini-2.0-pro-exp` - Advanced reasoning and coding

### Groq
- `llama-3.3-70b-versatile` - Powerful open-source model
- `llama-3.1-8b-instant` - Fast and efficient
- `mixtral-8x7b-32768` - Mixture of experts
- `gemma-2-9b-it` - Google's efficient model

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
