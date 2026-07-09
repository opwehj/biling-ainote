/**
 * @file __tests__/validation.test.ts
 * @description 测试 src/utils/validation.ts 输入校验工具。
 *              FileService.extractExtension 为纯字符串方法，createAppError 为纯函数，
 *              均使用真实实现以验证集成正确性。
 */
import {
  validateTextLength,
  validateImageCount,
  validateAudioExtension,
  validateApiKey,
  validateCategoryName,
  validateNoteTitle,
  isUri,
} from '../src/utils/validation';
import { INPUT_LIMITS, AUDIO_EXTENSIONS } from '../src/constants/config';
import type { AppError } from '../src/types';

/** 断言抛出指定 code 的 AppError */
function expectAppError(fn: () => void, code: string): void {
  expect(fn).toThrow();
  try {
    fn();
  } catch (e) {
    expect((e as AppError).code).toBe(code);
  }
}

describe('utils/validation', () => {
  describe('validateTextLength', () => {
    it('合法长度不抛错', () => {
      expect(() => validateTextLength('')).not.toThrow();
      expect(() => validateTextLength('a'.repeat(INPUT_LIMITS.MAX_TEXT_LENGTH))).not.toThrow();
    });

    it('超长文本抛 TEXT_TOO_LONG', () => {
      const longText = 'a'.repeat(INPUT_LIMITS.MAX_TEXT_LENGTH + 1);
      expectAppError(() => validateTextLength(longText), 'TEXT_TOO_LONG');
    });
  });

  describe('validateImageCount', () => {
    it('合法数量不抛错', () => {
      expect(() => validateImageCount(0)).not.toThrow();
      expect(() => validateImageCount(INPUT_LIMITS.MAX_IMAGE_COUNT)).not.toThrow();
    });

    it('超量抛 TOO_MANY_IMAGES', () => {
      expectAppError(
        () => validateImageCount(INPUT_LIMITS.MAX_IMAGE_COUNT + 1),
        'TOO_MANY_IMAGES',
      );
    });
  });

  describe('validateAudioExtension', () => {
    it.each(AUDIO_EXTENSIONS)('支持 .%s 格式', (ext) => {
      expect(() => validateAudioExtension(`file:///audio/test.${ext}`)).not.toThrow();
    });

    it('不支持的视频格式抛 UNSUPPORTED_AUDIO', () => {
      expectAppError(() => validateAudioExtension('file:///audio/test.mp4'), 'UNSUPPORTED_AUDIO');
    });

    it('带查询参数的 URI 仍能正确提取扩展名', () => {
      expect(() => validateAudioExtension('file:///audio/test.mp3?token=abc')).not.toThrow();
    });

    it('无扩展名抛 UNSUPPORTED_AUDIO', () => {
      expectAppError(() => validateAudioExtension('file:///audio/noext'), 'UNSUPPORTED_AUDIO');
    });
  });

  describe('validateApiKey', () => {
    it('合法 Key 不抛错', () => {
      expect(() => validateApiKey('sk-validkey123456', '通义千问')).not.toThrow();
    });

    it('空 Key 抛 EMPTY_API_KEY', () => {
      expectAppError(() => validateApiKey('', '通义千问'), 'EMPTY_API_KEY');
      expectAppError(() => validateApiKey('   ', '通义千问'), 'EMPTY_API_KEY');
    });

    it('过短 Key 抛 INVALID_API_KEY', () => {
      expectAppError(() => validateApiKey('short', '通义千问'), 'INVALID_API_KEY');
    });
  });

  describe('validateCategoryName', () => {
    it('合法名称不抛错', () => {
      expect(() => validateCategoryName('工作')).not.toThrow();
      expect(() => validateCategoryName('学习笔记')).not.toThrow();
    });

    it('空名称抛 EMPTY_NAME', () => {
      expectAppError(() => validateCategoryName(''), 'EMPTY_NAME');
      expectAppError(() => validateCategoryName('  '), 'EMPTY_NAME');
    });

    it('超长名称抛 NAME_TOO_LONG', () => {
      expectAppError(() => validateCategoryName('一'.repeat(21)), 'NAME_TOO_LONG');
    });

    it('刚好 20 字不抛错（边界）', () => {
      expect(() => validateCategoryName('一'.repeat(20))).not.toThrow();
    });
  });

  describe('validateNoteTitle', () => {
    it('合法标题不抛错', () => {
      expect(() => validateNoteTitle('')).not.toThrow();
      expect(() => validateNoteTitle('a'.repeat(100))).not.toThrow();
    });

    it('超长标题抛 TITLE_TOO_LONG', () => {
      expectAppError(() => validateNoteTitle('a'.repeat(101)), 'TITLE_TOO_LONG');
    });
  });

  describe('isUri', () => {
    it.each([
      ['file:///path/to/file.jpg', true],
      ['https://example.com/img.png', true],
      ['http://localhost:3000', true],
      ['content://media/image', true],
      ['asset:///app/asset.png', true],
    ])('isUri(%s) → %s', (value, expected) => {
      expect(isUri(value)).toBe(expected);
    });

    it.each([
      ['not a uri', false],
      ['', false],
      ['/relative/path', false],
      ['ftp://example.com', false],
    ])('isUri(%s) → %s', (value, expected) => {
      expect(isUri(value)).toBe(expected);
    });
  });
});
