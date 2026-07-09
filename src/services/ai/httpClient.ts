/**
 * @file services/ai/httpClient.ts
 * @description axios 实例 + OpenAI 兼容请求封装。
 *              统一处理超时、鉴权（Bearer）、错误转换（AppError）。
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { NETWORK_TIMEOUT } from '../../constants/config';
import type { AppError } from '../../types';
import logger from '../../utils/logger';

/** OpenAI 兼容消息内容块 */
export interface ChatContentPart {
  type: 'text' | 'image_url' | 'audio_url';
  text?: string;
  image_url?: { url: string };
  audio_url?: { url: string };
}

/** OpenAI 兼容消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

/** chat/completions 请求体 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/** chat/completions 响应体 */
export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 构造 AppError。
 */
export function createAppError(code: string, message: string, details?: unknown): AppError {
  return { code, message, details };
}

/**
 * 将 axios 错误转换为 AppError。
 */
function toAppError(err: unknown): AppError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ error?: { message?: string } }>;
    const status = axErr.response?.status;
    const apiMsg = axErr.response?.data?.error?.message ?? axErr.message;

    if (axErr.code === 'ECONNABORTED' || axErr.code === 'ETIMEDOUT') {
      return createAppError('TIMEOUT', '请求超时，请检查网络后重试', { status, detail: apiMsg });
    }
    if (status === 401 || status === 403) {
      return createAppError('AUTH_FAILED', 'API Key 无效或鉴权失败，请在设置中重新配置', { status, detail: apiMsg });
    }
    if (status === 429) {
      return createAppError('RATE_LIMIT', '请求过于频繁，请稍后重试', { status, detail: apiMsg });
    }
    if (status && status >= 500) {
      return createAppError('SERVER_ERROR', 'AI 服务暂时不可用，请稍后重试', { status, detail: apiMsg });
    }
    return createAppError('REQUEST_ERROR', apiMsg || '请求失败', { status });
  }
  const msg = err instanceof Error ? err.message : String(err);
  return createAppError('UNKNOWN', msg, err);
}

/**
 * 发送 OpenAI 兼容的 chat/completions 请求。
 * @param baseURL 提供商 baseURL
 * @param apiKey Bearer token
 * @param body 请求体
 * @param timeout 超时（毫秒）
 */
export async function postChatCompletion(
  baseURL: string,
  apiKey: string,
  body: ChatCompletionRequest,
  timeout: number = NETWORK_TIMEOUT.LLM,
): Promise<ChatCompletionResponse> {
  const url = baseURL.endsWith('/') ? `${baseURL}chat/completions` : `${baseURL}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  logger.debug('POST chat/completions', url, 'model=', body.model);
  try {
    const client: AxiosInstance = axios.create({ timeout });
    const resp = await client.post<ChatCompletionResponse>(url, body, { headers });
    return resp.data;
  } catch (err) {
    const appErr = toAppError(err);
    logger.error('postChatCompletion error', appErr);
    throw appErr;
  }
}

/**
 * 通用 GET 请求（用于 ASR 轮询查询任务状态）。
 */
export async function getJson<T>(
  url: string,
  apiKey: string,
  timeout: number = NETWORK_TIMEOUT.DEFAULT,
): Promise<T> {
  try {
    const client = axios.create({ timeout });
    const resp = await client.get<T>(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return resp.data;
  } catch (err) {
    throw toAppError(err);
  }
}

/**
 * 通用 POST 请求（用于 ASR 异步提交）。
 */
export async function postJson<T>(
  url: string,
  apiKey: string,
  body: unknown,
  timeout: number = NETWORK_TIMEOUT.DEFAULT,
): Promise<T> {
  try {
    const client = axios.create({ timeout });
    const resp = await client.post<T>(url, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return resp.data;
  } catch (err) {
    throw toAppError(err);
  }
}
