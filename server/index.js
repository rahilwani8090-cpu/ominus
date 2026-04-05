import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for real-time communication
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes (to be implemented)
app.use('/api/chat', (req, res) => {
  res.json({ message: 'Chat endpoint coming soon' });
});

app.use('/api/voice', (req, res) => {
  res.json({ message: 'Voice endpoint coming soon' });
});

app.use('/api/automation', (req, res) => {
  res.json({ message: 'Automation endpoint coming soon' });
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Listen for chat messages
  socket.on('message', (data) => {
    console.log('📨 Message received:', data);
    // Process message and broadcast back
    socket.emit('response', { status: 'received' });
  });

  // Listen for voice input
  socket.on('voice', (data) => {
    console.log('🎤 Voice input received');
    socket.emit('transcription', { text: 'Voice transcription coming soon' });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🤖 OMNIUS AI ASSISTANT STARTING UP                   ║
║                                                            ║
║     Real AI. Real Automation. JARVIS Level.              ║
║                                                            ║
║     Server running on: http://localhost:${PORT}              ║
║     Environment: ${process.env.NODE_ENV}                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app, io };
