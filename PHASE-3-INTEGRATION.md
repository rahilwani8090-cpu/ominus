# Phase 3 Integration Guide

## Quick Start (5 minutes)

### Option A: Use New PWA Version (Recommended for Phase 3)

Replace index.html with Phase 3 version:

```bash
# Backup old version
cp index.html index-backup.html

# Use new PWA version
cp index-pwa.html index.html

# Start backend
npm run dev

# Open http://localhost:3000
```

### Option B: Upgrade Existing HTML

Add to `<head>` of existing index.html:

```html
<!-- PWA Setup -->
<link rel="manifest" href="/client/manifest.json">
<meta name="theme-color" content="#1f2937">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="stylesheet" href="/client/style-pwa.css">
```

Update body:

```html
<!-- Add Service Worker Registration -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/client/service-worker.js');
  }
</script>

<!-- Replace app.js with app-pwa.js -->
<script src="/client/app-pwa.js"></script>
```

---

## File Structure

```
ominus/
├── client/
│   ├── service-worker.js      # Offline support
│   ├── app-pwa.js             # Real-time app logic
│   ├── manifest.json          # PWA metadata
│   └── style-pwa.css          # Mobile-first responsive
├── server/                    # Backend (already running)
├── index.html                 # Main page (update or use index-pwa.html)
├── index-pwa.html             # New Phase 3 version
└── style.css                  # Existing styles (backup)
```

---

## Features Available Now

### ✅ Real-Time Chat
- WebSocket connection to backend
- Live AI responses
- Typing indicators
- Message history

### ✅ Voice I/O
- Click 🎤 microphone button
- Live transcription
- AI voice response
- Language selection

### ✅ Workflow Automation
- Click menu → "New Automation"
- Build triggers (schedule, email, webhook)
- Add actions (email, calendar, AI generate, notify)
- Save & run automations

### ✅ Notifications
- Desktop push notifications
- Browser notifications
- In-app toasts
- Real-time alerts

### ✅ Offline Support
- Works without internet
- Queues messages
- Syncs when online
- Cached chat history

### ✅ Mobile-First UI
- Responsive on all devices
- Touch-friendly buttons (44px+)
- Mobile, tablet, desktop layouts
- Dark/light theme toggle

### ✅ Installation as App
- **iOS**: Share → Add to Home Screen
- **Android**: Menu → Install app
- **Desktop (Windows/Mac)**: Menu → Install app
- Works offline as installed app

---

## Testing Locally

### Start Backend

```bash
# Install dependencies (if needed)
npm install

# Start Express + Socket.IO server
npm run dev

# Backend running on http://localhost:3000
```

### Test PWA Features

#### 1. Real-Time Chat
1. Open http://localhost:3000
2. Type message
3. Click 📤 Send or press Enter
4. AI responds in real-time via WebSocket

#### 2. Voice Input
1. Click 🎤 microphone
2. Speak naturally
3. See live transcription
4. Message auto-submits
5. AI responds with voice

#### 3. Create Automation
1. Click ☰ Menu
2. Click "New Automation"
3. Select trigger: "Schedule"
4. Add action: "Generate with AI"
5. Click "Create Automation"
6. Automation runs on schedule

#### 4. Offline Mode
1. Open DevTools (F12)
2. Network tab → Offline
3. Chat still works locally
4. Messages queue
5. Go online → syncs

#### 5. Mobile Testing
```bash
# On your computer, find IP
ipconfig getifaddr en0        # Mac
hostname -I                   # Linux
ipconfig                      # Windows

# On mobile (same WiFi)
http://your-ip:3000

# Add to home screen (both iOS & Android)
```

#### 6. Install as App
1. Desktop: Menu → "Install OMNIUS"
2. Opens as standalone app
3. Works offline
4. Icon in taskbar/dock

---

## Configuration

### Backend Connection

Edit `client/app-pwa.js` if backend is on different host:

```javascript
// Line 7
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
```

### Voice Language

Set in Settings modal or code:

```javascript
// Line 25 in app-pwa.js
this.voiceLanguage = 'en-US'; // Change to other codes
```

### AI Model

Select in Settings modal or code:

```javascript
// Line 24 in app-pwa.js
this.selectedModel = 'groq'; // Or 'ollama', 'huggingface'
```

### Notifications

Enable/disable in Settings:

```javascript
// Toggle notifications on/off
this.notificationsEnabled = true;
```

---

## Debugging

### View Service Worker
1. DevTools → Application → Service Workers
2. Check registration, cache storage
3. Unregister to clear cache if needed

### Check WebSocket Connection
1. DevTools → Network tab
2. Filter by WS (WebSocket)
3. Should see connection to backend
4. Messages show in Frames tab

### Voice Issues
1. DevTools → Console
2. Check microphone permission
3. Check browser support (Chrome best)
4. Check HTTPS in production

### Performance
1. DevTools → Performance tab
2. Record and analyze
3. Check frame rate, CPU, memory
4. Optimize heavy operations

---

## Deployment

### Production Setup

1. **HTTPS Required** (for voice, PWA)
```bash
# Use Let's Encrypt or similar
export HTTPS=true
```

2. **Environment Variables**
```bash
# .env file
BACKEND_URL=https://your-domain.com
NODE_ENV=production
```

3. **Build for Production**
```bash
# Minify and optimize
npm run build

# Start server
npm start
```

### Hosting Options

- **Vercel**: Deploy from GitHub, free tier
- **Railway**: Node.js hosting, pay-as-you-go
- **Render**: Web services, free tier available
- **Heroku**: Platform-as-a-service (paid)
- **Self-hosted**: VPS or dedicated server

### Docker Deployment

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Chat | ✅ | ✅ | ✅ | ✅ |
| Voice | ✅ | ✅ | ⚠️ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Web App Install | ✅ | ❌ | iOS only | ✅ |
| Notifications | ✅ | ✅ | ❌ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |

⚠️ = Limited support
❌ = Not supported

---

## Troubleshooting

### Backend not responding
```
Error: Cannot connect to http://localhost:3000
→ Make sure npm run dev is running
→ Check port 3000 is not in use
→ Check firewall settings
```

### Voice not working
```
Error: Microphone not available
→ Check browser permissions
→ Chrome/Edge recommended
→ HTTPS required in production
→ Check microphone device
```

### PWA not installing
```
Warning: Install prompt not showing
→ Ensure manifest.json is linked
→ Use HTTPS
→ Must meet PWA criteria
→ Chrome DevTools → Application to check
```

### Service Worker not updating
```
Old version still showing
→ DevTools → Application → Clear storage
→ Or add version to sw URL: sw.js?v=2
→ Force refresh (Ctrl+Shift+R)
```

### Notifications not working
```
Error: Notification permission denied
→ Browser → Settings → Notifications → Allow
→ Or DevTools → Permissions → Notifications
```

---

## Performance Tips

1. **First Load**: ~2s (with service worker cache)
2. **Chat Latency**: ~100ms (WebSocket)
3. **Voice**: ~2s (Google STT + AI)
4. **File Upload**: ~500ms-2s (depends on file size)

### Optimize Further
- Minify CSS/JS
- Compress images (WebP)
- Use CDN for static assets
- Enable gzip compression
- Cache service worker updates

---

## Next Steps

### Phase 3 Remaining (20% to finish)
- [ ] Workflow builder UI refinement
- [ ] File upload UI
- [ ] Advanced search/filtering
- [ ] User preferences persistence
- [ ] Analytics dashboard

### Phase 4 (Production)
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring & logging
- [ ] Backup & disaster recovery
- [ ] Security audit
- [ ] Performance profiling
- [ ] Documentation finalization

---

## Support & Feedback

- **GitHub**: https://github.com/rahilwani8090-cpu/ominus
- **Issues**: Report bugs on GitHub
- **Docs**: Read PHASE-3-FRONTEND-PWA.md for full details

---

**Phase 3 is ready to deploy! 🚀**

Start with: `npm run dev` then open http://localhost:3000
