/**
 * @file __tests__/AINoteService.test.ts
 * @description 测试 src/services/ai/AINoteService.ts 编排流程、取消逻辑、输入校验。
 */
import { AINoteService } from '../src/services/ai/AINoteService';
import type { AISetting, GenerateNoteRequest, NoteContent, Material, GenerationProgress } from '../src/types';
import { INPUT_LIMITS } from '../src/constants/config';

// mock ProviderFactory（静态工厂）—— mock 函数在工厂内部定义，避免 TDZ
jest.mock('../src/services/ai/ProviderFactory', () => {
  const generateNote = jest.fn();
  return {
    ProviderFactory: {
      create: jest.fn(() => ({
        generateNote,
        id: 'qwen',
        name: '通义千问',
        baseURL: 'https://test/v1',
        supportsAudio: true,
        defaultAudioModel: 'qwen2-audio-instruct',
      })),
    },
    __mockGenerateNote: generateNote,
  };
});

// mock AsrService —— mock 函数在工厂内部定义，避免 TDZ
jest.mock('../src/services/ai/AsrService', () => {
  const transcribe = jest.fn();
  return {
    AsrService: jest.fn().mockImplementation(() => ({ transcribe })),
    __mockTranscribe: transcribe,
  };
});

// mock httpClient 的 createAppError（保持真实行为）
jest.mock('../src/services/ai/httpClient', () => ({
  createAppError: (code: string, message: string, details?: unknown) => ({ code, message, details }),
}));

// mock generateId（可预测）
jest.mock('../src/utils/id', () => ({
  generateId: jest.fn((() => {
    let i = 0;
    return () => `id-${++i}`;
  })()),
  default: jest.fn(() => 'id-default'),
}));

import { __mockGenerateNote as mockGenerateNote } from '../src/services/ai/ProviderFactory';
import { __mockTranscribe as mockTranscribe } from '../src/services/ai/AsrService';
import type { AppError } from '../src/types';

const baseSetting: AISetting = {
  llmProvider: 'qwen',
  llmModel: 'qwen-plus',
  visionModel: 'qwen-vl-plus',
  asrEnabled: true,
  temperature: 0.7,
  maxTokens: 2000,
  themeMode: 'system',
  sortOrder: 'updated_desc',
};

const sampleNoteContent: NoteContent = {
  title: '测试笔记',
  summary: '摘要',
  keyPoints: ['要点1'],
  content: '# 正文',
  tags: ['标签'],
};

function expectAppError(promise: Promise<unknown>, code: string): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`期望抛出 ${code} 错误，但 Promise 被 resolve`);
    },
    (err: AppError) => {
      expect(err.code).toBe(code);
    },
  );
}

describe('services/ai/AINoteService', () => {
  let service: AINoteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AINoteService();
    mockGenerateNote.mockResolvedValue(sampleNoteContent);
    mockTranscribe.mockResolvedValue('音频转写结果');
  });

  describe('输入校验', () => {
    it('缺少 llmKey 应抛 NO_API_KEY', async () => {
      const req: GenerateNoteRequest = { text: 'hi', imageUris: [], audioUris: [], materials: [] };
      await expectAppError(
        service.generateNote(req, baseSetting, { llmKey: '' }),
        'NO_API_KEY',
      );
    });

    it('文本超长应抛 TEXT_TOO_LONG', async () => {
      const req: GenerateNoteRequest = {
        text: 'a'.repeat(INPUT_LIMITS.MAX_TEXT_LENGTH + 1),
        imageUris: [],
        audioUris: [],
        materials: [],
      };
      await expectAppError(
        service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }),
        'TEXT_TOO_LONG',
      );
    });

    it('图片超量应抛 TOO_MANY_IMAGES', async () => {
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: Array.from({ length: INPUT_LIMITS.MAX_IMAGE_COUNT + 1 }, (_, i) => `img${i}`),
        audioUris: [],
        materials: [],
      };
      await expectAppError(
        service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }),
        'TOO_MANY_IMAGES',
      );
    });

    it('无任何输入应抛 NO_INPUT', async () => {
      const req: GenerateNoteRequest = { text: '   ', imageUris: [], audioUris: [], materials: [] };
      await expectAppError(
        service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }),
        'NO_INPUT',
      );
    });

    it('仅有 materials 输入应通过校验', async () => {
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: [],
        materials: [{ id: 'm1', noteId: '', type: 'text', content: '已有素材', createdAt: 1 }],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      expect(result.content).toEqual(sampleNoteContent);
    });
  });

  describe('编排流程 - 纯文本', () => {
    it('应调用 provider.generateNote 并返回结果', async () => {
      const req: GenerateNoteRequest = { text: '一段文本', imageUris: [], audioUris: [], materials: [] };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });

      expect(mockGenerateNote).toHaveBeenCalledTimes(1);
      expect(result.content).toEqual(sampleNoteContent);
      // 应生成 text 类型的 material
      const textMaterials = result.materials.filter((m) => m.type === 'text');
      expect(textMaterials).toHaveLength(1);
      expect(textMaterials[0].content).toBe('一段文本');
    });

    it('应将 setting 中的 model/temperature/maxTokens 透传给 provider', async () => {
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      const opts = mockGenerateNote.mock.calls[0][2];
      expect(opts.model).toBe(baseSetting.llmModel);
      expect(opts.visionModel).toBe(baseSetting.visionModel);
      expect(opts.temperature).toBe(baseSetting.temperature);
      expect(opts.maxTokens).toBe(baseSetting.maxTokens);
    });
  });

  describe('编排流程 - 含图片', () => {
    it('应生成 image 类型素材并透传 imageUris', async () => {
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: ['file:///img1.png', 'file:///img2.png'],
        audioUris: [],
        materials: [],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      const imageMaterials = result.materials.filter((m) => m.type === 'image');
      expect(imageMaterials).toHaveLength(2);
      // 透传给 provider 的请求应包含 imageUris
      const genReq = mockGenerateNote.mock.calls[0][0];
      expect(genReq.imageUris).toHaveLength(2);
    });
  });

  describe('编排流程 - 含音频（ASR 开启）', () => {
    it('应转写音频并回写 transcript', async () => {
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['file:///audio1.m4a'],
        materials: [],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });

      expect(mockTranscribe).toHaveBeenCalledTimes(1);
      const audioMaterials = result.materials.filter((m) => m.type === 'audio');
      expect(audioMaterials).toHaveLength(1);
      expect(audioMaterials[0].transcript).toBe('音频转写结果');
    });

    it('转写文本应拼入生成请求', async () => {
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['file:///a.m4a'],
        materials: [],
      };
      await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      const genReq = mockGenerateNote.mock.calls[0][0];
      expect(genReq.text).toContain('音频转写');
      expect(genReq.text).toContain('音频转写结果');
    });

    it('多条音频应逐条转写', async () => {
      mockTranscribe
        .mockResolvedValueOnce('转写一')
        .mockResolvedValueOnce('转写二');
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a1.m4a', 'a2.m4a'],
        materials: [],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      expect(mockTranscribe).toHaveBeenCalledTimes(2);
      expect(result.materials.filter((m) => m.type === 'audio')).toHaveLength(2);
    });

    it('ASR 失败应降级不阻断流程', async () => {
      mockTranscribe.mockRejectedValueOnce(new Error('ASR error'));
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a1.m4a'],
        materials: [],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      // 流程仍应完成
      expect(result.content).toEqual(sampleNoteContent);
      const audioMat = result.materials.find((m) => m.type === 'audio');
      expect(audioMat?.transcript).toBe('');
      // 生成请求文本应包含失败提示
      const genReq = mockGenerateNote.mock.calls[0][0];
      expect(genReq.text).toContain('音频转写失败');
    });

    it('转写结果为空应提示转写结果为空', async () => {
      mockTranscribe.mockResolvedValueOnce('');
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a1.m4a'],
        materials: [],
      };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      const audioMat = result.materials.find((m) => m.type === 'audio');
      expect(audioMat?.transcript).toBe('');
      const genReq = mockGenerateNote.mock.calls[0][0];
      expect(genReq.text).toContain('转写结果为空');
    });
  });

  describe('编排流程 - ASR 关闭', () => {
    it('asrEnabled=false 时不转写，仅记录音频素材', async () => {
      const settingNoAsr = { ...baseSetting, asrEnabled: false };
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a1.m4a'],
        materials: [],
      };
      const result = await service.generateNote(req, settingNoAsr, { llmKey: 'sk-key1234' });
      expect(mockTranscribe).not.toHaveBeenCalled();
      const audioMat = result.materials.find((m) => m.type === 'audio');
      expect(audioMat?.transcript).toContain('已关闭');
    });
  });

  describe('进度回调', () => {
    it('纯文本流程应触发 generating 和 done 阶段', async () => {
      const phases: GenerationProgress[] = [];
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }, (p) => phases.push(p));
      const phaseValues = phases.map((p) => p.phase);
      expect(phaseValues).toContain('generating');
      expect(phaseValues).toContain('done');
      expect(phaseValues[phaseValues.length - 1]).toBe('done');
    });

    it('含图片应触发 recognizing 阶段', async () => {
      const phases: GenerationProgress[] = [];
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: ['img.png'],
        audioUris: [],
        materials: [],
      };
      await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }, (p) => phases.push(p));
      expect(phases.map((p) => p.phase)).toContain('recognizing');
    });

    it('含音频应触发 transcribing 阶段', async () => {
      const phases: GenerationProgress[] = [];
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a.m4a'],
        materials: [],
      };
      await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }, (p) => phases.push(p));
      expect(phases.map((p) => p.phase)).toContain('transcribing');
    });

    it('onProgress 回调异常不应中断主流程', async () => {
      const badProgress = jest.fn(() => {
        throw new Error('callback error');
      });
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' }, badProgress);
      expect(result.content).toEqual(sampleNoteContent);
    });
  });

  describe('取消逻辑', () => {
    it('cancel 应设置取消状态', () => {
      expect(service.isCancelled()).toBe(false);
      service.cancel();
      expect(service.isCancelled()).toBe(true);
    });

    it('在 ASR 转写过程中取消应在下一检查点抛 CANCELLED', async () => {
      // 让 transcribe 返回一个可控的延迟 promise，模拟进行中的异步流程
      let resolveTranscribe!: (v: string) => void;
      mockTranscribe.mockReturnValueOnce(
        new Promise<string>((res) => {
          resolveTranscribe = res;
        }),
      );

      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a.m4a'],
        materials: [],
      };
      // 发起生成（此时 generateNote 已同步执行到 await transcribe 并挂起）
      const promise = service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      await Promise.resolve(); // 让 microtask 推进
      // 在 transcribe 进行中取消
      service.cancel();
      expect(service.isCancelled()).toBe(true);
      // 完成 transcribe，流程恢复后在下一个 throwIfCancelled 抛错
      resolveTranscribe('转写');

      await expectAppError(promise, 'CANCELLED');
    });

    it('在多音频转写中取消应在下一条音频检查点抛 CANCELLED', async () => {
      let resolveFirst!: (v: string) => void;
      mockTranscribe
        .mockReturnValueOnce(new Promise<string>((res) => { resolveFirst = res; }))
        .mockResolvedValueOnce('转写二');

      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: ['a1.m4a', 'a2.m4a'],
        materials: [],
      };
      const promise = service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      await Promise.resolve();
      service.cancel();
      resolveFirst('转写一');

      await expectAppError(promise, 'CANCELLED');
    });

    it('新的 generateNote 调用应重置取消状态并正常完成', async () => {
      service.cancel();
      expect(service.isCancelled()).toBe(true);
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      // 取消后发起新生成：cancelled 在 generateNote 开头被重置为 false，应正常完成
      const result = await service.generateNote(req, baseSetting, { llmKey: 'sk-key1234' });
      expect(result.content).toEqual(sampleNoteContent);
      expect(service.isCancelled()).toBe(false);
    });
  });
});
