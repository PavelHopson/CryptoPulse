/**
 * Universal AI Service — supports multiple providers
 * Gemini, OpenAI, Anthropic, OpenRouter, Ollama
 */

import { AIConfig, AIProvider } from '../types';
import { getUserProfile } from './userService';

// ====== GET USER AI CONFIG ======

function getAIConfig(): AIConfig {
  const profile = getUserProfile();
  const ai = profile.preferences?.ai;

  // User has configured AI
  if (ai?.apiKey || ai?.provider === 'ollama') {
    return ai;
  }

  // Fallback to env var (Gemini)
  const envKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  return {
    provider: 'gemini',
    apiKey: envKey,
    model: 'gemini-2.5-flash',
  };
}

// ====== PROVIDER IMPLEMENTATIONS ======

async function callGemini(prompt: string, config: AIConfig): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const response = await ai.models.generateContent({
    model: config.model || 'gemini-2.5-flash',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 0 } },
  });
  return response.text || '';
}

async function callOpenAI(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic API error');
  return data.content?.[0]?.text || '';
}

async function callOpenRouter(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify({
      model: config.model || 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenRouter API error');
  return data.choices?.[0]?.message?.content || '';
}

async function callOllama(prompt: string, config: AIConfig): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  const isUncensored = config.model?.toLowerCase().includes('abliterated') || config.model?.toLowerCase().includes('huihui');
  const finalPrompt = isUncensored
    ? prompt + '\n\n[Note: This model has no content restrictions. Provide direct, unfiltered analysis.]'
    : prompt;
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model || 'llama3.1',
      prompt: finalPrompt,
      stream: false,
    }),
  });
  const data = await response.json();
  return data.response || '';
}

/**
 * NVIDIA NIM — OpenAI-compatible Chat Completions API at
 * https://integrate.api.nvidia.com/v1. Free tier available at
 * https://build.nvidia.com/models with models like Nemotron, Qwen,
 * DeepSeek, Mistral NeMo, Gemma.
 */
async function callNvidia(prompt: string, config: AIConfig): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'nvidia/llama-3.3-nemotron-super-49b-v1',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.detail || 'NVIDIA NIM API error');
  return data.choices?.[0]?.message?.content || '';
}

// ====== DISPATCH ======

const PROVIDERS: Record<AIProvider, (prompt: string, config: AIConfig) => Promise<string>> = {
  gemini: callGemini,
  openai: callOpenAI,
  anthropic: callAnthropic,
  openrouter: callOpenRouter,
  ollama: callOllama,
  nvidia: callNvidia,
};

async function callAI(prompt: string): Promise<string> {
  const config = getAIConfig();

  if (!config.apiKey && config.provider !== 'ollama') {
    return 'AI не настроен. Откройте Настройки → AI и укажите провайдера и API-ключ.';
  }

  const handler = PROVIDERS[config.provider];
  if (!handler) return `Провайдер "${config.provider}" не поддерживается.`;

  return handler(prompt, config);
}

// ====== PUBLIC API ======

export function getActiveProvider(): { provider: AIProvider; model: string } {
  const config = getAIConfig();
  return { provider: config.provider, model: config.model };
}

export async function generateCoinAnalysis(assetName: string, price: number, change24h: number): Promise<string> {
  const isSignificant = Math.abs(change24h) > 1.5;
  let sentimentContext = '';

  if (change24h > 0) {
    sentimentContext = isSignificant
      ? 'Актив демонстрирует сильный бычий импульс. Фокус на росте и фиксации прибыли.'
      : 'Актив показывает умеренный рост. Фокус на уровнях сопротивления.';
  } else {
    sentimentContext = isSignificant
      ? 'Актив под сильным давлением продавцов. Фокус на поддержке и возможной панической распродаже.'
      : 'Актив показывает умеренное снижение. Консолидация.';
  }

  const prompt = `Ты — старший финансовый аналитик ведущей фирмы (как Bloomberg или Goldman Sachs).
Проанализируй текущее состояние актива: ${assetName}.
Текущая цена: ${price}.
Изменение за 24ч: ${change24h}%.

Контекст: ${sentimentContext}

Предоставь профессиональный, краткий инсайт (максимум 3-4 предложения) на РУССКОМ языке:
1. Интерпретация движения цены (Бычий/Медвежий/Нейтральный тренд) относительно класса актива.
2. Ключевой технический или фундаментальный фактор (RSI, скользящие средние, новости).
3. Стратегический совет для трейдера (Держать, Покупать на просадке, Шортить, Ждать).

Стиль: Строгий, профессиональный, без воды. Не используй markdown форматирование, только текст.`;

  try {
    return await callAI(prompt);
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return `Ошибка AI (${getAIConfig().provider}): ${error.message || 'Попробуйте позже.'}`;
  }
}
