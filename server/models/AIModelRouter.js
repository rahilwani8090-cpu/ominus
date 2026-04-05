/**
 * AIModelRouter - Intelligent routing between multiple AI providers
 * Supports: Groq (free), Ollama (local), HuggingFace (free)
 * 
 * REAL AI - No fake responses, actual model integration
 */

import axios from 'axios';
import { Groq } from 'groq-sdk';

class AIModelRouter {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    this.providers = {
      groq: this.queryGroq.bind(this),
      ollama: this.queryOllama.bind(this),
      huggingface: this.queryHuggingFace.bind(this)
    };

    this.defaultProvider = 'groq';
    this.fallbackChain = ['groq', 'ollama', 'huggingface'];
    this.modelConfig = {
      // Groq models (free tier: 500k tokens/day)
      groq: {
        fast: 'mixtral-8x7b-32768',
        balanced: 'llama2-70b-4096',
        powerful: 'llama-3.3-70b-versatile',
        code: 'llama-3.1-405b-reasoning'
      },
      // Ollama (free, local)
      ollama: {
        fast: 'mistral',
        balanced: 'llama2',
        powerful: 'llama2-uncensored',
        code: 'wizardcoder'
      },
      // HuggingFace (free inference)
      huggingface: {
        fast: 'meta-llama/Llama-2-7b-hf',
        balanced: 'meta-llama/Llama-2-70b-hf',
        powerful: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B',
        code: 'mistralai/Mistral-7B-Instruct-v0.1'
      }
    };
  }

  /**
   * Route request to best available provider
   * @param {string} prompt - User input
   * @param {object} options - { provider, model, taskType, temperature, maxTokens }
   * @returns {Promise} Real AI response
   */
  async route(prompt, options = {}) {
    const {
      provider = this.defaultProvider,
      taskType = 'general',
      temperature = 0.7,
      maxTokens = 2000,
      debug = false
    } = options;

    try {
      // Try primary provider first
      if (debug) console.log(`🎯 Routing to ${provider}...`);
      return await this.providers[provider](prompt, {
        taskType,
        temperature,
        maxTokens
      });
    } catch (error) {
      console.warn(`⚠️  ${provider} failed:`, error.message);

      // Try fallback providers
      for (const fallback of this.fallbackChain) {
        if (fallback === provider) continue;
        try {
          console.log(`🔄 Switching to fallback: ${fallback}`);
          return await this.providers[fallback](prompt, {
            taskType,
            temperature,
            maxTokens
          });
        } catch (fallbackError) {
          console.warn(`⚠️  ${fallback} also failed:`, fallbackError.message);
        }
      }

      // All providers failed
      throw new Error('All AI providers unavailable. Check API keys and internet connection.');
    }
  }

  /**
   * Query Groq API (Real, free tier)
   */
  async queryGroq(prompt, options) {
    const { taskType, temperature, maxTokens } = options;
    const model = this.modelConfig.groq.balanced;

    const message = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      temperature,
      max_tokens: maxTokens,
      top_p: 1,
      stop: null
    });

    return {
      provider: 'groq',
      model,
      response: message.choices[0]?.message?.content || '',
      usage: {
        prompt_tokens: message.usage?.prompt_tokens,
        completion_tokens: message.usage?.completion_tokens,
        total_tokens: message.usage?.total_tokens
      },
      timestamp: new Date()
    };
  }

  /**
   * Query Ollama (Local, free)
   * Requires Ollama running: ollama serve
   */
  async queryOllama(prompt, options) {
    const { taskType, temperature, maxTokens } = options;
    const model = this.modelConfig.ollama.balanced;
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const response = await axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    });

    return {
      provider: 'ollama',
      model,
      response: response.data.response || '',
      tokens: response.data.eval_count,
      timestamp: new Date()
    };
  }

  /**
   * Query HuggingFace (Free inference API)
   */
  async queryHuggingFace(prompt, options) {
    const { taskType, temperature, maxTokens } = options;
    const model = this.modelConfig.huggingface.balanced;
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY not configured');
    }

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          temperature,
          max_new_tokens: maxTokens,
          return_full_text: false
        }
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );

    return {
      provider: 'huggingface',
      model,
      response: response.data[0]?.generated_text || '',
      timestamp: new Date()
    };
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess(prompts, options = {}) {
    const results = await Promise.allSettled(
      prompts.map(prompt => this.route(prompt, options))
    );

    return {
      total: prompts.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        prompt: prompts[i],
        result: r.status === 'fulfilled' ? r.value : { error: r.reason.message },
        success: r.status === 'fulfilled'
      }))
    };
  }

  /**
   * Check provider health
   */
  async checkHealth() {
    const health = {};

    // Check Groq
    try {
      await this.groq.models.list();
      health.groq = { status: 'ok', tokens: '500k/day' };
    } catch (e) {
      health.groq = { status: 'error', error: e.message };
    }

    // Check Ollama
    try {
      const response = await axios.get(
        `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`
      );
      health.ollama = { status: 'ok', models: response.data.models?.length || 0 };
    } catch (e) {
      health.ollama = { status: 'error', error: e.message };
    }

    // Check HuggingFace
    try {
      if (process.env.HUGGINGFACE_API_KEY) {
        const response = await axios.get('https://huggingface.co/api/whoami', {
          headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` }
        });
        health.huggingface = { status: 'ok', user: response.data.name };
      }
    } catch (e) {
      health.huggingface = { status: 'error', error: e.message };
    }

    return health;
  }
}

export default new AIModelRouter();
