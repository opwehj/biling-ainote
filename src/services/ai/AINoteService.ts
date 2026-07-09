/**
 * @file services/ai/AINoteService.ts
 * @description 笔记生成编排器：协调 ASR 转写 + 多模态 LLM 生成。
 *              通过 onProgress 回调驱动 UI 进度展示，支持 cancel。
 *
 * 流程：
 * 1. 转写音频素材（ASR）→ 回写 material.transcript
 * 2. 将 文本 + 图片(base64) + 转写文本 送入视觉 LLM → NoteContent JSON
 * 3. 返回 { content, materials }
 */

import type {
  GenerateNoteRequest,
  AISetting,
  NoteContent,
  Material,
  GenerationProgress,
} from '../../types';
import { ProviderFactory } from './ProviderFactory';
import type { BaseLLMProvider } from './BaseLLMProvider';
import { AsrService } from './AsrService';
import { createAppError } from './httpClient';
import { generateId } from '../../utils/id';
import { INPUT_LIMITS } from '../../constants/config';
import logger from '../../utils/logger';

/**
 * 笔记生成编排器。
 */
export class AINoteService {
  private cancelled = false;
  private asrService: AsrService;

  constructor(asrService?: AsrService) {
    this.asrService = asrService ?? new AsrService();
  }

  /**
   * 生成笔记主流程。
   * @param request 生成请求
   * @param setting AI 设置
   * @param apiKeys LLM Key 与可选 ASR Key
   * @param onProgress 进度回调
   */
  async generateNote(
    request: GenerateNoteRequest,
    setting: AISetting,
    apiKeys: { llmKey: string; asrKey?: string },
    onProgress?: (p: GenerationProgress) => void,
  ): Promise<{ content: NoteContent; materials: Material[] }> {
    this.cancelled = false;

    if (!apiKeys.llmKey) {
      throw createAppError('NO_API_KEY', '请先在设置中配置 API Key');
    }

    // 校验输入
    this.validateRequest(request);

    const provider = ProviderFactory.create(setting.llmProvider);

    // 构造素材快照（不直接修改入参）
    const materials: Material[] = [...(request.materials ?? [])];

    // 收集待处理的文本/图片/音频
    const textParts: string[] = [];
    if (request.text?.trim()) {
      textParts.push(request.text.trim());
      materials.push(this.makeMaterial('text', request.text.trim()));
    }
    const imageUris = [...request.imageUris];
    for (const uri of imageUris) {
      materials.push(this.makeMaterial('image', uri));
    }
    const audioUris = [...request.audioUris];

    // === 阶段 1：转写音频 ===
    if (audioUris.length > 0 && setting.asrEnabled) {
      this.emit(onProgress, {
        phase: 'transcribing',
        message: `正在转写音频（共 ${audioUris.length} 条）`,
      });
      const audioMaterials: Material[] = [];
      for (const uri of audioUris) {
        this.throwIfCancelled();
        const mat = this.makeMaterial('audio', uri);
        try {
          const transcript = await this.asrService.transcribe(uri, {
            provider,
            llmKey: apiKeys.llmKey,
            asrKey: apiKeys.asrKey,
          });
          mat.transcript = transcript;
          if (transcript) {
            textParts.push(`【音频转写】\n${transcript}`);
          } else {
            mat.transcript = '';
            textParts.push('【音频转写】（转写结果为空）');
          }
        } catch (err) {
          logger.error('ASR failed for audio', uri, err);
          mat.transcript = '';
          textParts.push('【音频转写失败，请检查音频或 ASR 配置】');
          // 不阻断整体流程
        }
        audioMaterials.push(mat);
      }
      materials.push(...audioMaterials);
    } else if (audioUris.length > 0 && !setting.asrEnabled) {
      // ASR 关闭时仅记录音频素材，不转写
      for (const uri of audioUris) {
        const mat = this.makeMaterial('audio', uri);
        mat.transcript = '（语音转写已关闭）';
        materials.push(mat);
      }
    }

    // === 阶段 2：多模态生成 ===
    this.throwIfCancelled();
    if (imageUris.length > 0) {
      this.emit(onProgress, {
        phase: 'recognizing',
        message: `正在识别图片（共 ${imageUris.length} 张）`,
      });
    }
    this.emit(onProgress, { phase: 'generating', message: '正在整理笔记…' });

    const generateRequest: GenerateNoteRequest = {
      text: textParts.join('\n\n'),
      imageUris,
      audioUris: [],
      materials: [],
    };

    this.throwIfCancelled();
    const content = await provider.generateNote(generateRequest, apiKeys.llmKey, {
      model: setting.llmModel,
      visionModel: setting.visionModel,
      temperature: setting.temperature,
      maxTokens: setting.maxTokens,
    });

    this.emit(onProgress, { phase: 'done', message: '生成完成' });

    return { content, materials };
  }

  /**
   * 取消生成。
   */
  cancel(): void {
    this.cancelled = true;
    logger.info('AINoteService cancelled');
  }

  /**
   * 是否已取消。
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * 校验输入。
   */
  private validateRequest(request: GenerateNoteRequest): void {
    if (request.text && request.text.length > INPUT_LIMITS.MAX_TEXT_LENGTH) {
      throw createAppError(
        'TEXT_TOO_LONG',
        `文本不能超过 ${INPUT_LIMITS.MAX_TEXT_LENGTH} 字符`,
      );
    }
    if (request.imageUris.length > INPUT_LIMITS.MAX_IMAGE_COUNT) {
      throw createAppError(
        'TOO_MANY_IMAGES',
        `图片不能超过 ${INPUT_LIMITS.MAX_IMAGE_COUNT} 张`,
      );
    }
    const hasInput =
      (request.text?.trim().length ?? 0) > 0 ||
      request.imageUris.length > 0 ||
      request.audioUris.length > 0 ||
      (request.materials?.length ?? 0) > 0;
    if (!hasInput) {
      throw createAppError('NO_INPUT', '请至少输入文本、图片或音频');
    }
  }

  /**
   * 构造素材对象（noteId 后续由持久化层补全）。
   */
  private makeMaterial(type: Material['type'], content: string): Material {
    return {
      id: generateId(),
      noteId: '',
      type,
      content,
      createdAt: Date.now(),
    };
  }

  /**
   * 若已取消则抛错。
   */
  private throwIfCancelled(): void {
    if (this.cancelled) {
      throw createAppError('CANCELLED', '笔记生成已取消');
    }
  }

  /**
   * 安全触发进度回调。
   */
  private emit(
    onProgress: ((p: GenerationProgress) => void) | undefined,
    p: GenerationProgress,
  ): void {
    if (onProgress) {
      try {
        onProgress(p);
      } catch (err) {
        logger.warn('onProgress callback error', err);
      }
    }
  }
}

/** 单例 */
export const aiNoteService = new AINoteService();
