/**
 * VoiceService - Real voice input/output
 * Speech-to-Text: Google Cloud Speech API
 * Text-to-Speech: Google Cloud TTS or ElevenLabs
 * 
 * REAL Voice - Actual human-like voices, not robot
 */

import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

class VoiceService {
  constructor() {
    this.speechClient = null;
    this.ttsClient = null;
    this.initializeClients();
  }

  /**
   * Initialize Google Cloud clients
   */
  initializeClients() {
    if (process.env.GOOGLE_CLOUD_KEY_FILE) {
      try {
        this.speechClient = new speech.SpeechClient({
          keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
        });

        this.ttsClient = new textToSpeech.TextToSpeechClient({
          keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
        });

        console.log('✅ Google Cloud voice clients initialized');
      } catch (error) {
        console.warn('⚠️  Google Cloud clients failed:', error.message);
      }
    }
  }

  /**
   * Transcribe audio to text (Speech-to-Text)
   * REAL - Uses Google Cloud Speech API
   */
  async transcribeAudio(audioFile, language = 'en-US') {
    if (!this.speechClient) {
      throw new Error('Google Cloud Speech API not configured');
    }

    try {
      // Read audio file
      const audio = {
        content: fs.readFileSync(audioFile).toString('base64')
      };

      const config = {
        encoding: 'LINEAR16',
        languageCode: language,
        sampleRateHertz: 16000,
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      };

      const request = {
        audio,
        config
      };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      // Get confidence score
      const confidence = response.results[0]?.alternatives[0]?.confidence || 0;

      return {
        text: transcription,
        confidence: confidence,
        language: language,
        timestamp: new Date(),
        isFinal: response.results[response.results.length - 1].isFinal
      };
    } catch (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Stream audio transcription (real-time)
   * REAL - Streams audio as it's being spoken
   */
  async streamTranscribe(audioStream, language = 'en-US') {
    if (!this.speechClient) {
      throw new Error('Google Cloud Speech API not configured');
    }

    const config = {
      encoding: 'LINEAR16',
      languageCode: language,
      sampleRateHertz: 16000,
      interimResults: true,
      enableAutomaticPunctuation: true
    };

    const request = {
      config,
      interimResults: true
    };

    return new Promise((resolve, reject) => {
      const stream = this.speechClient.streamingRecognize(request);
      let finalTranscription = '';
      let lastResult = null;

      stream.on('data', (response) => {
        const result = response.results[0];

        if (!result) return;

        const isFinal = result.isFinal;
        const transcript = result.alternatives[0].transcript;

        if (isFinal) {
          finalTranscription += transcript + ' ';
          lastResult = {
            text: finalTranscription.trim(),
            confidence: result.alternatives[0].confidence,
            isFinal: true
          };
        } else {
          lastResult = {
            text: finalTranscription + transcript,
            confidence: 0,
            isFinal: false
          };
        }
      });

      stream.on('end', () => {
        resolve({
          text: finalTranscription.trim(),
          language,
          timestamp: new Date()
        });
      });

      stream.on('error', reject);
      audioStream.pipe(stream);
    });
  }

  /**
   * Synthesize text to speech (Text-to-Speech)
   * REAL - Uses Google Cloud TTS with human voices
   */
  async synthesizeSpeech(text, options = {}) {
    const {
      language = 'en-US',
      voice = 'en-US-Neural2-C',
      audioFormat = 'MP3',
      speakingRate = 1.0,
      pitch = 0
    } = options;

    // Use ElevenLabs if configured and available
    if (process.env.ELEVENLABS_API_KEY) {
      return this.synthesizeWithElevenLabs(text, language, speakingRate);
    }

    // Fallback to Google Cloud TTS
    if (!this.ttsClient) {
      throw new Error('Google Cloud TTS not configured');
    }

    try {
      const request = {
        input: { text },
        voice: {
          languageCode: language,
          name: voice
        },
        audioConfig: {
          audioEncoding: audioFormat,
          speakingRate,
          pitch
        }
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);
      const audioContent = response.audioContent;

      // Save to file
      const filename = `audio_${Date.now()}.mp3`;
      const filepath = path.join(process.env.TEMP_DIR || './temp', filename);
      fs.writeFileSync(filepath, audioContent, 'binary');

      return {
        audio: audioContent,
        format: 'mp3',
        size: audioContent.length,
        voice: voice,
        language: language,
        duration: Math.ceil(text.split(' ').length / 2.5), // Rough estimate
        file: filename
      };
    } catch (error) {
      throw new Error(`Synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize with ElevenLabs (Free tier: 10k chars/month)
   * REAL - High-quality human-like voices
   */
  async synthesizeWithElevenLabs(text, language = 'en', speakingRate = 1.0) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Save to file
      const filename = `audio_${Date.now()}.mp3`;
      const filepath = path.join(process.env.TEMP_DIR || './temp', filename);
      fs.writeFileSync(filepath, response.data);

      return {
        audio: response.data,
        format: 'mp3',
        size: response.data.length,
        provider: 'elevenlabs',
        voice: voiceId,
        language,
        file: filename
      };
    } catch (error) {
      throw new Error(`ElevenLabs synthesis failed: ${error.message}`);
    }
  }

  /**
   * List available voices
   */
  async listAvailableVoices(language = 'en-US') {
    if (!this.ttsClient) {
      throw new Error('Google Cloud TTS not configured');
    }

    try {
      const [result] = await this.ttsClient.listVoices({ languageCode: language });

      return {
        voices: result.voices.map(v => ({
          name: v.name,
          ssmlGender: v.ssmlGender,
          naturalSampleRateHertz: v.naturalSampleRateHertz
        })),
        language
      };
    } catch (error) {
      throw new Error(`Failed to list voices: ${error.message}`);
    }
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(audioFile) {
    if (!this.speechClient) {
      throw new Error('Google Cloud Speech API not configured');
    }

    // Use speech recognition with language hints to detect
    const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'ja-JP'];

    for (const lang of languages) {
      try {
        const result = await this.transcribeAudio(audioFile, lang);
        if (result.confidence > 0.5) {
          return {
            language: lang,
            confidence: result.confidence
          };
        }
      } catch (error) {
        // Try next language
        continue;
      }
    }

    return {
      language: 'en-US',
      confidence: 0,
      method: 'default'
    };
  }

  /**
   * Get voice quota usage
   */
  async getQuotaUsage() {
    return {
      google_cloud: {
        status: this.speechClient ? 'configured' : 'not-configured',
        pricing: 'Free tier: 60 min/month'
      },
      elevenlabs: {
        status: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not-configured',
        pricing: 'Free tier: 10k chars/month'
      }
    };
  }
}

export default new VoiceService();
