/**
 * @file constants/config.ts
 * @description 应用级常量：数据库名、超时、输入上限、提示词模板等。
 *              所有魔数集中管理，便于统一调整。
 */

/** 数据库配置 */
export const DB_CONFIG = {
  NAME: 'biling.db',
  VERSION: 1,
} as const;

/** 网络超时（毫秒） */
export const NETWORK_TIMEOUT = {
  /** 普通请求 30s */
  DEFAULT: 30_000,
  /** LLM 单次生成 60s */
  LLM: 60_000,
  /** ASR 单次提交 30s */
  ASR_SUBMIT: 30_000,
} as const;

/** ASR 轮询配置 */
export const ASR_POLL = {
  INTERVAL_MS: 2_000,
  MAX_TIMES: 60,
} as const;

/** 输入上限（PRD 4.1） */
export const INPUT_LIMITS = {
  /** 文本最大字符数 */
  MAX_TEXT_LENGTH: 10_000,
  /** 图片最大张数 */
  MAX_IMAGE_COUNT: 9,
  /** 图片压缩后长边像素 */
  IMAGE_MAX_DIMENSION: 1_920,
  /** 图片压缩后最大体积（字节） */
  IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  /** 单张图片 base64 目标体积（字节） */
  IMAGE_BASE64_TARGET_BYTES: 1 * 1024 * 1024,
  /** 音频最大时长（秒） */
  AUDIO_MAX_DURATION_S: 30 * 60,
  /** 音频最大体积（字节） */
  AUDIO_MAX_BYTES: 50 * 1024 * 1024,
  /** 标签最大数量 */
  MAX_TAGS: 5,
} as const;

/** 支持的图片格式 */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];

/** 支持的音频格式 */
export const AUDIO_EXTENSIONS = ['m4a', 'mp3', 'wav', 'aac'];

/** 笔记生成系统提示词模板 */
export const SYSTEM_PROMPT = `你是一位专业的笔记整理助手。请根据用户提供的素材（文本、图片、音频转写文字）生成结构化笔记。

要求：
1. 必须返回合法的 JSON，格式为：
   {"title":"","summary":"","keyPoints":[],"content":"","tags":[]}
2. title：简洁的标题，不超过 20 字。
3. summary：一段摘要，100 字以内。
4. keyPoints：3-6 个要点，每个要点一行字符串。
5. content：使用 Markdown 格式的正文，包含适当的小标题、列表与段落。
6. tags：3-5 个标签，每个标签 2-6 字。
7. 只返回 JSON 本身，不要包含任何解释、注释或 markdown 代码块标记。
8. 若素材为空或无法理解，返回 title 为"未命名笔记"，content 简要说明。

请确保输出严格符合 JSON 规范，可直接被 JSON.parse 解析。`;

/** 默认 AI 设置（首次启动 / 重置时使用） */
export const DEFAULT_AI_SETTING = {
  llmProvider: 'qwen' as const,
  llmModel: 'qwen-plus',
  visionModel: 'qwen-vl-plus',
  asrEnabled: true,
  temperature: 0.7,
  maxTokens: 2000,
  themeMode: 'system' as const,
  sortOrder: 'updated_desc' as const,
};

/** 生成阶段文案映射 */
export const PHASE_MESSAGES = {
  idle: '准备中',
  transcribing: '正在转写音频',
  recognizing: '正在识别图片',
  generating: '正在整理笔记',
  done: '生成完成',
  error: '生成失败',
} as const;

/** 分页大小 */
export const PAGE_SIZE = 50;
