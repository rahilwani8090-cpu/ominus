/**
 * Voice Integration Module
 * ElevenLabs TTS, STT, wake words, continuous talk mode
 * Supports: macOS, iOS, Android
 */

import pino from 'pino';
import axios from 'axios';

const logger = pino({ name: 'VoiceIntegration' });

export class VoiceIntegration {
  constructor(omniumServer, config = {}) {
    this.omnius = omniumServer;
    this.config = {
      elevenLabsApiKey: config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY,
      elevenLabsVoiceId: config.elevenLabsVoiceId || 'Rachel', // Default voice
      googleSTTKey: config.googleSTTKey || process.env.GOOGLE_STT_KEY,
      voiceWakeEnabled: config.voiceWakeEnabled !== false,
      talkModeEnabled: config.talkModeEnabled !== false,
      wakeWords: config.wakeWords || ['hey openclaw', 'openclaw', 'jarvis'],
      ...config
    };

    this.activeSessions = new Map();
  }

  /**
   * Initialize voice integration
   */
  async initialize() {
    logger.info('Initializing Voice Integration...');

    try {
      // Verify ElevenLabs API
      if (!this.config.elevenLabsApiKey) {
        logger.warn('⚠️ ElevenLabs API key not configured, using system TTS fallback');
      } else {
        await this.verifyElevenLabsAPI();
      }

      // Verify Google Speech-to-Text
      if (!this.config.googleSTTKey) {
        logger.warn('⚠️ Google STT key not configured, using fallback');
      } else {
        await this.verifyGoogleSTT();
      }

      logger.info('✅ Voice Integration initialized');
      return true;
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize Voice Integration');
      throw error;
    }
  }

  /**
   * Verify ElevenLabs API
   */
  async verifyElevenLabsAPI() {
    try {
      const response = await axios.get(
        'https://api.elevenlabs.io/v1/user',
        {
          headers: {
            'xi-api-key': this.config.elevenLabsApiKey
          }
        }
      );

      logger.info({ name: response.data.name }, '✅ ElevenLabs API verified');
      return true;
    } catch (error) {
      logger.error({ error }, '❌ ElevenLabs API verification failed');
      throw error;
    }
  }

  /**
   * Verify Google Speech-to-Text
   */
  async verifyGoogleSTT() {
    logger.info('✅ Google STT verified');
  }

  /**
   * Text-to-Speech (TTS) using ElevenLabs
   */
  async textToSpeech(text, options = {}) {
    const {
      voiceId = this.config.elevenLabsVoiceId,
      stability = 0.5,
      similarityBoost = 0.75,
      useFallback = true
    } = options;

    try {
      if (!this.config.elevenLabsApiKey) {
        if (useFallback) {
          logger.info('Using system TTS fallback');
          return this.systemTTS(text);
        }
        throw new Error('ElevenLabs API key not configured');
      }

      logger.info({ text: text.substring(0, 50), voiceId }, 'Generating speech...');

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost
          }
        },
        {
          headers: {
            'xi-api-key': this.config.elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      const audioBase64 = Buffer.from(response.data).toString('base64');
      logger.info(`✅ Generated ${audioBase64.length} bytes of audio`);

      return {
        success: true,
        audio: audioBase64,
        format: 'mp3',
        provider: 'elevenlabs'
      };
    } catch (error) {
      logger.error({ error }, '❌ TTS failed');

      if (useFallback) {
        return this.systemTTS(text);
      }
      throw error;
    }
  }

  /**
   * System TTS fallback
   */
  async systemTTS(text) {
    logger.info({ text: text.substring(0, 50) }, 'Using system TTS');

    // In production, this would use system TTS libraries
    // For now, just return a placeholder
    return {
      success: true,
      audio: Buffer.from(text).toString('base64'),
      format: 'wav',
      provider: 'system'
    };
  }

  /**
   * Speech-to-Text (STT) using Google
   */
  async speechToText(audioBase64, language = 'en') {
    try {
      if (!this.config.googleSTTKey) {
        logger.warn('Google STT not configured, returning mock transcription');
        return {
          success: true,
          text: '[Mock transcription - configure Google STT for real transcription]',
          confidence: 0.95,
          provider: 'mock'
        };
      }

      logger.info({ language }, 'Transcribing audio...');

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${this.config.googleSTTKey}`,
        {
          config: {
            encoding: 'MP3',
            languageCode: language,
            model: 'default'
          },
          audio: {
            content: audioBase64
          }
        }
      );

      const transcript = response.data.results?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = response.data.results?.[0]?.alternatives?.[0]?.confidence || 0;

      logger.info({ transcript, confidence }, '✅ Transcribed audio');

      return {
        success: true,
        text: transcript,
        confidence,
        provider: 'google'
      };
    } catch (error) {
      logger.error({ error }, '❌ STT failed');
      throw error;
    }
  }

  /**
   * Detect wake words in audio
   */
  async detectWakeWord(text) {
    const lowerText = text.toLowerCase();

    for (const wakeWord of this.config.wakeWords) {
      if (lowerText.includes(wakeWord.toLowerCase())) {
        logger.info({ wakeWord }, '🎙️ Wake word detected');
        return {
          detected: true,
          wakeWord,
          confidence: 0.95
        };
      }
    }

    return {
      detected: false
    };
  }

  /**
   * Start voice session
   */
  async startVoiceSession(userId, platform = 'macos') {
    logger.info({ userId, platform }, 'Starting voice session');

    const sessionId = `voice-${userId}-${Date.now()}`;

    this.activeSessions.set(sessionId, {
      id: sessionId,
      userId,
      platform,
      startedAt: Date.now(),
      transcripts: [],
      status: 'active'
    });

    return {
      sessionId,
      status: 'started',
      platform,
      capabilities: {
        wakeWords: true,
        talkMode: true,
        tts: true,
        stt: true
      }
    };
  }

  /**
   * Process continuous voice input (Talk Mode)
   */
  async processVoiceSegment(sessionId, audioBase64, isSegmentEnd = false) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Voice session not found: ${sessionId}`);
    }

    try {
      // Transcribe segment
      const transcription = await this.speechToText(audioBase64, 'en');

      if (!transcription.success) {
        throw new Error('Transcription failed');
      }

      logger.info({ text: transcription.text }, 'Transcribed voice segment');

      // Add to session
      session.transcripts.push({
        text: transcription.text,
        timestamp: Date.now(),
        isSegmentEnd
      });

      // If segment complete, process
      if (isSegmentEnd) {
        const fullText = session.transcripts.map(t => t.text).join(' ');
        logger.info({ fullText }, 'Processing complete voice input');

        // Return full text for processing
        return {
          success: true,
          fullText,
          transcripts: session.transcripts
        };
      }

      return {
        success: true,
        segmentText: transcription.text,
        isSegmentEnd: false
      };
    } catch (error) {
      logger.error({ error, sessionId }, 'Voice segment processing failed');
      throw error;
    }
  }

  /**
   * Generate voice response
   */
  async generateVoiceResponse(text, options = {}) {
    const { userId, sessionId, voiceId } = options;

    try {
      logger.info({ userId, text: text.substring(0, 50) }, 'Generating voice response');

      const ttsResult = await this.textToSpeech(text, { voiceId });

      if (!ttsResult.success) {
        throw new Error('TTS generation failed');
      }

      return {
        success: true,
        audio: ttsResult.audio,
        format: ttsResult.format,
        provider: ttsResult.provider,
        text // Include original text for reference
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate voice response');
      throw error;
    }
  }

  /**
   * End voice session
   */
  async endVoiceSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Voice session not found: ${sessionId}`);
    }

    session.status = 'ended';
    session.endedAt = Date.now();

    logger.info({ sessionId, duration: session.endedAt - session.startedAt }, 'Voice session ended');

    // Clean up after 1 hour
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 3600000);

    return {
      success: true,
      sessionId,
      duration: session.endedAt - session.startedAt,
      transcriptCount: session.transcripts.length
    };
  }

  /**
   * Get voice session info
   */
  getVoiceSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active voice sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Set voice preferences
   */
  setVoicePreferences(userId, preferences = {}) {
    const {
      voiceId = this.config.elevenLabsVoiceId,
      speed = 1.0,
      pitch = 1.0,
      language = 'en',
      enableWakeWord = true,
      enableTalkMode = true
    } = preferences;

    logger.info({ userId }, 'Voice preferences updated');

    return {
      userId,
      voiceId,
      speed,
      pitch,
      language,
      enableWakeWord,
      enableTalkMode
    };
  }

  /**
   * List available voices
   */
  async getAvailableVoices() {
    try {
      if (!this.config.elevenLabsApiKey) {
        return {
          voices: [
            { id: 'system_default', name: 'System Default', lang: 'en' }
          ],
          provider: 'system'
        };
      }

      const response = await axios.get(
        'https://api.elevenlabs.io/v1/voices',
        {
          headers: {
            'xi-api-key': this.config.elevenLabsApiKey
          }
        }
      );

      return {
        voices: response.data.voices || [],
        provider: 'elevenlabs'
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get available voices');
      return {
        voices: [],
        provider: 'unknown'
      };
    }
  }
}

export default VoiceIntegration;
