/**
 * @file __tests__/BaseLLMProvider.test.ts
 * @description 测试 src/services/ai/BaseLLMProvider.ts。
 *              通过 TestProvider 子类暴露 protected 方法，重点测试 parseNoteContent 容错解析、
 *              buildUserContent 构造、normalizeNoteContent 规范化、testConnection、generateNote 编排。
 */
import { BaseLLMProvider } from '../src/services/ai/BaseLLMProvider';
import type { NoteContent, GenerateNoteRequest, LLMProviderId } from '../src/types';
import { INPUT_LIMITS, SYSTEM_PROMPT } from '../src/constants/config';

// mock httpClient（axios 网络层）
jest.mock('../src/services/ai/httpClient', () => ({
  postChatCompletion: jest.fn(),
  createAppError: (code: string, message: string, details?: unknown) => ({ code, message, details }),
}));

// mock FileService（文件系统层）
jest.mock('../src/services/storage/FileService', () => ({
  FileService: {
    inferMimeType: jest.fn((uri: string) => {
      if (uri.endsWith('.png')) return 'image/png';
      if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) return 'image/jpeg';
      return 'application/octet-stream';
    }),
    readAsDataUrl: jest.fn(async (uri: string, mime: string) => `data:${mime};base64,AAA`),
    readAsBase64: jest.fn(async () => 'AAA'),
  },
}));

const { postChatCompletion } = require('../src/services/ai/httpClient');
const { FileService } = require('../src/services/storage/FileService');

/**
 * 测试用 Provider 子类：暴露 protected 方法供测试。
 */
class TestProvider extends BaseLLMProvider {
  readonly id: LLMProviderId = 'qwen';
  readonly name = '测试提供商';
  readonly baseURL = 'https://test.example.com/v1';
  readonly defaultModel = 'test-model';
  readonly defaultVisionModel = 'test-vision';
  readonly supportsAudio = true;
  readonly defaultAudioModel = 'test-audio';

  // 暴露 protected 方法
  publicParseNoteContent(raw: string): NoteContent {
    return this.parseNoteContent(raw);
  }
  publicBuildUserContent(text: string, imageUris: string[]) {
    return this.buildUserContent(text, imageUris);
  }
  publicBuildSystemPrompt(): string {
    return this.buildSystemPrompt();
  }
  publicBuildHeaders(apiKey: string) {
    return this.buildHeaders(apiKey);
  }
}

describe('services/ai/BaseLLMProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
    jest.clearAllMocks();
  });

  describe('parseNoteContent - 容错解析', () => {
    it('应解析合法 JSON', () => {
      const raw = JSON.stringify({
        title: '会议纪要',
        summary: '讨论了项目进度',
        keyPoints: ['要点一', '要点二'],
        content: '# 会议纪要\n详细内容',
        tags: ['会议', '项目'],
      });
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('会议纪要');
      expect(result.summary).toBe('讨论了项目进度');
      expect(result.keyPoints).toEqual(['要点一', '要点二']);
      expect(result.tags).toEqual(['会议', '项目']);
    });

    it('应去除 markdown 代码块标记后解析', () => {
      const raw = '```json\n{"title":"标题","summary":"","keyPoints":[],"content":"正文","tags":[]}\n```';
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('标题');
      expect(result.content).toBe('正文');
    });

    it('应去除无语言标记的代码块', () => {
      const raw = '```\n{"title":"无标记","summary":"","keyPoints":[],"content":"","tags":[]}\n```';
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('无标记');
    });

    it('应从混合文本中正则提取 JSON 块', () => {
      const raw = '好的，这是您的笔记：\n{"title":"提取","summary":"摘要","keyPoints":["a"],"content":"c","tags":["t"]}\n希望对您有帮助！';
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('提取');
      expect(result.keyPoints).toEqual(['a']);
    });

    it('空字符串应降级为 fallback', () => {
      const result = provider.publicParseNoteContent('');
      expect(result.title).toBe('未命名笔记');
      expect(result.content).toBe('（生成内容为空）');
      expect(result.keyPoints).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it('无法解析的纯文本应降级：原文作为 content', () => {
      const raw = '这是一段无法解析为 JSON 的纯文本内容';
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('未命名笔记');
      expect(result.content).toBe(raw);
      expect(result.summary).toBe('');
    });

    it('损坏的 JSON 应降级', () => {
      const raw = '{"title":"损坏","summary": incomplete';
      const result = provider.publicParseNoteContent(raw);
      expect(result.title).toBe('未命名笔记');
      expect(result.content).toBe(raw);
    });
  });

  describe('parseNoteContent - normalizeNoteContent 规范化', () => {
    it('title 缺失或为空应回退为"未命名笔记"', () => {
      const result = provider.publicParseNoteContent(
        JSON.stringify({ title: '', summary: '', keyPoints: [], content: 'c', tags: [] }),
      );
      expect(result.title).toBe('未命名笔记');
    });

    it('tags 超过上限应截断为 MAX_TAGS 个', () => {
      const manyTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = provider.publicParseNoteContent(
        JSON.stringify({ title: 't', summary: '', keyPoints: [], content: 'c', tags: manyTags }),
      );
      expect(result.tags).toHaveLength(INPUT_LIMITS.MAX_TAGS);
    });

    it('keyPoints 为字符串应按分隔符拆分为数组', () => {
      const result = provider.publicParseNoteContent(
        JSON.stringify({ title: 't', summary: '', keyPoints: '一、要点A、要点B', content: 'c', tags: [] }),
      );
      expect(result.keyPoints.length).toBeGreaterThanOrEqual(2);
      expect(result.keyPoints).toContain('要点A');
    });

    it('keyPoints 含空值应被过滤', () => {
      const result = provider.publicParseNoteContent(
        JSON.stringify({ title: 't', summary: '', keyPoints: ['有效', '', '有效2'], content: 'c', tags: [] }),
      );
      expect(result.keyPoints).toEqual(['有效', '有效2']);
    });

    it('content 缺失时应回退使用 summary', () => {
      const result = provider.publicParseNoteContent(
        JSON.stringify({ title: 't', summary: '这是摘要', keyPoints: [], content: '', tags: [] }),
      );
      expect(result.content).toBe('这是摘要');
    });

    it('非对象类型（数组）应降级', () => {
      const result = provider.publicParseNoteContent('[1,2,3]');
      expect(result.title).toBe('未命名笔记');
    });

    it('非对象类型（字符串）应降级', () => {
      const result = provider.publicParseNoteContent('"just a string"');
      expect(result.title).toBe('未命名笔记');
    });
  });

  describe('buildUserContent', () => {
    it('纯文本（无图片）应返回字符串', async () => {
      const content = await provider.publicBuildUserContent('一些文本', []);
      expect(typeof content).toBe('string');
      expect(content).toBe('一些文本');
    });

    it('空文本无图片应返回占位提示', async () => {
      const content = await provider.publicBuildUserContent('', []);
      expect(content).toContain('无文本内容');
    });

    it('含图片应返回多模态内容数组', async () => {
      const content = await provider.publicBuildUserContent('文本', ['file:///a.png']);
      expect(Array.isArray(content)).toBe(true);
      const parts = content as Array<{ type: string }>;
      expect(parts[0].type).toBe('text');
      expect(parts.some((p) => p.type === 'image_url')).toBe(true);
    });

    it('含图片但无文本应插入默认提示', async () => {
      const content = await provider.publicBuildUserContent('', ['file:///a.png']);
      const parts = content as Array<{ type: string; text?: string }>;
      expect(parts[0].text).toContain('根据以下图片生成结构化笔记');
    });

    it('图片数量超过 MAX_IMAGE_COUNT 应截断', async () => {
      const uris = Array.from({ length: INPUT_LIMITS.MAX_IMAGE_COUNT + 5 }, (_, i) => `file:///img${i}.png`);
      const content = await provider.publicBuildUserContent('t', uris);
      const parts = content as Array<{ type: string }>;
      const imageParts = parts.filter((p) => p.type === 'image_url');
      expect(imageParts).toHaveLength(INPUT_LIMITS.MAX_IMAGE_COUNT);
    });

    it('imageToDataUrl 失败时应跳过该图片不中断', async () => {
      (FileService.readAsDataUrl as jest.Mock).mockRejectedValueOnce(new Error('read fail'));
      const content = await provider.publicBuildUserContent('t', ['file:///bad.png']);
      const parts = content as Array<{ type: string }>;
      expect(parts[0].type).toBe('text');
      // 图片因读取失败被跳过
      expect(parts.filter((p) => p.type === 'image_url')).toHaveLength(0);
    });
  });

  describe('buildSystemPrompt / buildHeaders', () => {
    it('buildSystemPrompt 应返回 SYSTEM_PROMPT', () => {
      expect(provider.publicBuildSystemPrompt()).toBe(SYSTEM_PROMPT);
    });

    it('buildHeaders 应包含 Bearer token', () => {
      const headers = provider.publicBuildHeaders('sk-test123');
      expect(headers['Authorization']).toBe('Bearer sk-test123');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('testConnection', () => {
    it('成功响应应返回 true', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce({
        choices: [{ index: 0, message: { role: 'assistant', content: '你好' }, finish_reason: 'stop' }],
      });
      const ok = await provider.testConnection('sk-key');
      expect(ok).toBe(true);
      expect(postChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('空 choices 应返回 false', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce({ choices: [] });
      const ok = await provider.testConnection('sk-key');
      expect(ok).toBe(false);
    });

    it('请求异常应返回 false（不抛错）', async () => {
      (postChatCompletion as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const ok = await provider.testConnection('sk-key');
      expect(ok).toBe(false);
    });

    it('应使用传入的 model 覆盖默认', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce({
        choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }],
      });
      await provider.testConnection('sk-key', 'custom-model');
      const body = (postChatCompletion as jest.Mock).mock.calls[0][2];
      expect(body.model).toBe('custom-model');
    });
  });

  describe('generateNote', () => {
    const mockResponse = (content: string) => ({
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    });

    it('纯文本请求应使用 defaultModel', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce(
        mockResponse(JSON.stringify({ title: 'T', summary: 'S', keyPoints: [], content: 'C', tags: [] })),
      );
      const req: GenerateNoteRequest = { text: 'hello', imageUris: [], audioUris: [], materials: [] };
      const result = await provider.generateNote(req, 'sk-key');
      expect(result.title).toBe('T');
      const body = (postChatCompletion as jest.Mock).mock.calls[0][2];
      expect(body.model).toBe('test-model'); // defaultModel
      expect(body.messages).toHaveLength(2);
    });

    it('含图片请求应使用 visionModel', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce(
        mockResponse(JSON.stringify({ title: 'V', summary: '', keyPoints: [], content: 'c', tags: [] })),
      );
      const req: GenerateNoteRequest = { text: 't', imageUris: ['file:///a.png'], audioUris: [], materials: [] };
      await provider.generateNote(req, 'sk-key');
      const body = (postChatCompletion as jest.Mock).mock.calls[0][2];
      expect(body.model).toBe('test-vision'); // defaultVisionModel
    });

    it('应拼接音频转写文本到请求', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce(
        mockResponse(JSON.stringify({ title: 'A', summary: '', keyPoints: [], content: 'c', tags: [] })),
      );
      const req: GenerateNoteRequest = {
        text: '',
        imageUris: [],
        audioUris: [],
        materials: [{ id: 'm1', noteId: '', type: 'audio', content: 'uri', transcript: '转写文字', createdAt: 1 }],
      };
      await provider.generateNote(req, 'sk-key');
      const body = (postChatCompletion as jest.Mock).mock.calls[0][2];
      const userContent = body.messages[1].content;
      expect(userContent).toContain('音频转写');
      expect(userContent).toContain('转写文字');
    });

    it('应使用 options 覆盖 model/temperature/maxTokens', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce(
        mockResponse(JSON.stringify({ title: 'O', summary: '', keyPoints: [], content: 'c', tags: [] })),
      );
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      await provider.generateNote(req, 'sk-key', { model: 'override-model', temperature: 0.1, maxTokens: 500 });
      const body = (postChatCompletion as jest.Mock).mock.calls[0][2];
      expect(body.model).toBe('override-model');
      expect(body.temperature).toBe(0.1);
      expect(body.max_tokens).toBe(500);
    });

    it('空响应 content 应降级为 fallback', async () => {
      (postChatCompletion as jest.Mock).mockResolvedValueOnce({ choices: [] });
      const req: GenerateNoteRequest = { text: 't', imageUris: [], audioUris: [], materials: [] };
      const result = await provider.generateNote(req, 'sk-key');
      expect(result.title).toBe('未命名笔记');
      expect(result.content).toBe('（生成内容为空）');
    });
  });
});
