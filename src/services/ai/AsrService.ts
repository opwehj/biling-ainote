/**
 * @file services/ai/AsrService.ts
 * @description 语音转写服务（混合策略）。
 * - 提供商支持音频模型（Qwen qwen2-audio）→ 经 OpenAI 兼容接口调用，复用 LLM Key；
 * - 否则 → 回退 DashScope paraformer 专用 ASR，需 asrKey（异步提交 + 轮询）。
 */

import type { BaseLLMProvider } from './BaseLLMProvider';
import { postChatCompletion, postJson, getJson, createAppError } from './httpClient';
import { FileService } from '../storage/FileService';
import { NETWORK_TIMEOUT, ASR_POLL } from '../../constants/config';
import logger from '../../utils/logger';

/** DashScope paraformer 异步接口基础地址 */
const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

/** paraformer 异步提交响应 */
interface ParaformerSubmitResponse {
  output?: { task_id?: string; task_status?: string };
  request_id?: string;
}

/** paraformer 任务查询响应 */
interface ParaformerTaskResponse {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{ transcription_url?: string; audio_url?: string }>;
    text?: string;
  };
  request_id?: string;
}

/**
 * 语音转写服务。
 */
export class AsrService {
  /**
   * 统一入口：自动路由到 LLM 音频模型或 paraformer。
   * @param audioUri 音频文件 URI
   * @param opts 提供商、LLM Key、可选 ASR Key
   * @returns 转写文本
   */
  async transcribe(
    audioUri: string,
    opts: { provider: BaseLLMProvider; llmKey: string; asrKey?: string },
  ): Promise<string> {
    const { provider, llmKey, asrKey } = opts;

    if (provider.supportsAudio && provider.defaultAudioModel) {
      logger.info(`ASR via LLM audio model (${provider.defaultAudioModel})`);
      return this.transcribeViaLLM(audioUri, provider, llmKey);
    }

    logger.info('ASR via DashScope paraformer');
    if (!asrKey) {
      throw createAppError(
        'ASR_KEY_MISSING',
        '当前提供商不支持原生音频转写，请在设置中配置"语音转写 Key"（DashScope）',
      );
    }
    return this.transcribeViaParaformer(audioUri, asrKey);
  }

  /**
   * 经 LLM 音频模型转写（Qwen qwen2-audio，OpenAI 兼容接口）。
   */
  protected async transcribeViaLLM(
    audioUri: string,
    provider: BaseLLMProvider,
    llmKey: string,
  ): Promise<string> {
    const mimeType = FileService.inferMimeType(audioUri);
    const dataUrl = await FileService.readAsDataUrl(audioUri, mimeType);

    const resp = await postChatCompletion(
      provider.baseURL,
      llmKey,
      {
        model: provider.defaultAudioModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '请将这段音频转写为文字，只输出转写文本，不要添加额外说明。' },
              { type: 'audio_url', audio_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      },
      NETWORK_TIMEOUT.LLM,
    );
    return resp.choices?.[0]?.message?.content?.trim() ?? '';
  }

  /**
   * 经 DashScope paraformer 转写（异步提交 + 轮询）。
   * paraformer-v2 经 DashScope 异步任务接口。
   */
  protected async transcribeViaParaformer(audioUri: string, asrKey: string): Promise<string> {
    // 读取音频为 base64，构造 data URL
    const mimeType = FileService.inferMimeType(audioUri);
    const dataUrl = await FileService.readAsDataUrl(audioUri, mimeType);

    // 1. 异步提交
    const submitBody = {
      model: 'paraformer-v2',
      input: {
        file_urls: [dataUrl],
      },
      parameters: {
        language_hints: ['zh', 'en'],
      },
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
    };

    const submitResp = await postJson<ParaformerSubmitResponse>(
      `${DASHSCOPE_BASE}/services/audio/asr/transcription`,
      asrKey,
      submitBody,
      NETWORK_TIMEOUT.ASR_SUBMIT,
    );

    const taskId = submitResp.output?.task_id;
    if (!taskId) {
      throw createAppError('ASR_SUBMIT_FAILED', '语音转写任务提交失败');
    }
    logger.debug('paraformer task submitted:', taskId);

    // 2. 轮询查询
    const result = await this.pollTask(taskId, asrKey);

    // 3. 提取文本
    const text = result.output?.text;
    if (text) return text.trim();

    const transcriptionUrl = result.output?.results?.[0]?.transcription_url;
    if (transcriptionUrl) {
      const detail = await getJson<{ text?: string; sentences?: Array<{ text?: string }> }>(
        transcriptionUrl,
        asrKey,
      );
      if (detail.text) return detail.text.trim();
      if (detail.sentences?.length) {
        return detail.sentences.map((s) => s.text ?? '').join('').trim();
      }
    }
    return '';
  }

  /**
   * 轮询查询 ASR 任务状态。
   * 间隔 2s，最多 60 次（2 分钟）。
   */
  private async pollTask(taskId: string, apiKey: string): Promise<ParaformerTaskResponse> {
    const url = `${DASHSCOPE_BASE}/tasks/${taskId}`;
    for (let i = 0; i < ASR_POLL.MAX_TIMES; i++) {
      await this.sleep(ASR_POLL.INTERVAL_MS);
      const resp = await getJson<ParaformerTaskResponse>(url, apiKey);
      const status = resp.output?.task_status;
      logger.debug(`paraformer poll [${i + 1}/${ASR_POLL.MAX_TIMES}] status=${status}`);
      if (status === 'SUCCEEDED') {
        return resp;
      }
      if (status === 'FAILED') {
        throw createAppError('ASR_FAILED', '语音转写任务失败');
      }
      // PENDING / RUNNING 继续轮询
    }
    throw createAppError('ASR_TIMEOUT', '语音转写超时');
  }

  /**
   * sleep 工具。
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** 单例 */
export const asrService = new AsrService();
