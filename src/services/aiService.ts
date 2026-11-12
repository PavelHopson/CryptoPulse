/**
 * Universal AI Service — supports multiple providers
 * Gemini, OpenAI, Anthropic, OpenRouter, Ollama
 */

import { AIConfig, AIProvider } from '../types';
import { getUserProfile } from './userService';
import { callAIGateway } from './aiGateway';

const SERVER_GATEWAY_ENABLED = import.meta.env.VITE_AI_GATEWAY_MODE === 'server';

// ====== GET USER AI CONFIG ======

function getAIConfig(): AIConfig {
  const profile = getUserProfile();
  const ai = profile.preferences?.ai;

  // In server mode the selected provider/model still come from the user's
  // profile, but the provider key must stay out of the browser request.
  if (SERVER_GATEWAY_ENABLED && ai?.provider) {
    return { ...ai, apiKey: '' };
  }

  // User has configured AI
  if (ai?.apiKey || ai?.provider === 'ollama') {
    return ai;
  }

  // Client builds must never receive a provider key from environment variables.
  // Configure a key explicitly in the local session or use the future server gateway.
  return {
    provider: 'gemini',
    apiKey: '',
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
  if (!response.ok) throw new Error('Ollama request failed');
  const data = await response.json();
  if (!data || typeof data.response !== 'string') throw new Error('Ollama response invalid');
  return data.response;
}

/**
 * NVIDIA NIM — OpenAI-compatible Chat Completions API at
 * https://integrate.api.nvidia.com/v1. Availability and limits depend on
 * the user's provider account; models include Nemotron, Qwen, DeepSeek,
 * Mistral NeMo and Gemma.
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

  const serverMode = SERVER_GATEWAY_ENABLED;
  const gatewayEndpoint = typeof import.meta.env.VITE_AI_GATEWAY_URL === 'string'
    ? import.meta.env.VITE_AI_GATEWAY_URL.trim()
    : '';

  if (!serverMode && !config.apiKey && config.provider !== 'ollama') {
    return 'AI не настроен. Откройте Настройки → AI и укажите провайдера и API-ключ.';
  }

  const handler = PROVIDERS[config.provider];
  if (!handler) return `Провайдер "${config.provider}" не поддерживается.`;

  const request = serverMode
    ? {
        mode: 'server' as const,
        provider: config.provider,
        model: config.model,
        prompt,
        endpoint: gatewayEndpoint,
      }
    : {
        mode: 'client' as const,
        provider: config.provider,
        model: config.model,
        prompt,
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
      };

  const response = await callAIGateway(
    request,
    {
      clientInvoker: async (input) => handler(input.prompt, {
        ...config,
        apiKey: input.apiKey,
        ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      }),
    },
  );
  return response.text;
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
      ? 'Актив демонстрирует сильное положительное движение. Фокус на проверяемых уровнях и рисках сценария.'
      : 'Актив показывает умеренный рост. Фокус на уровнях сопротивления и качестве данных.';
  } else {
    sentimentContext = isSignificant
      ? 'Актив под сильным давлением. Фокус на поддержке, ликвидности и рисках сценария.'
      : 'Актив показывает умеренное снижение. Консолидация.';
  }

const prompt = `Ты — исследовательский ассистент по рыночным данным. Не выдавай себя за финансового консультанта и не формулируй торговые сигналы.
Проанализируй текущее состояние актива: ${assetName}.
Текущая цена: ${price}.
Изменение за 24ч: ${change24h}%.

Контекст: ${sentimentContext}

Предоставь краткий исследовательский разбор (максимум 4-5 предложений) на РУССКОМ языке:
1. Наблюдаемая динамика цены и её контекст относительно класса актива, без прогноза.
2. Ключевой технический или фундаментальный фактор (RSI, скользящие средние, новости).
3. Наблюдаемая гипотеза для paper-исследования и что проверить дальше. Не давай команд покупать, продавать или открывать позицию.
4. Качество данных и риск: укажи, чего не хватает для вывода и какой риск у этой гипотезы.

Принцип: не давай overconfident-прогнозов — рынок непредсказуем, прошлые движения не гарантируют будущие. Если данных мало — скажи об этом прямо. Это не индивидуальная инвестиционная рекомендация (DYOR).
Стиль: Строгий, профессиональный, без воды. Не используй markdown форматирование, только текст.`;

  try {
    return await callAI(prompt);
  } catch {
    return 'Ошибка AI: проверьте настройки провайдера и повторите попытку.';
  }
}
