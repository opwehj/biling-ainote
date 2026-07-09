/**
 * @file __tests__/date.test.ts
 * @description 测试 src/utils/date.ts 时间格式化工具。
 */
import {
  formatRelativeTime,
  formatDate,
  formatDateTime,
  formatDuration,
  formatFileSize,
} from '../src/utils/date';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

describe('utils/date', () => {
  describe('formatDate', () => {
    it('应格式化为 YYYY-MM-DD', () => {
      const ts = new Date(2025, 0, 5, 13, 30).getTime(); // 2025-01-05
      expect(formatDate(ts)).toBe('2025-01-05');
    });

    it('应对个位数月/日补零', () => {
      const ts = new Date(2024, 2, 9).getTime(); // 2024-03-09
      expect(formatDate(ts)).toBe('2024-03-09');
    });

    it('应处理 12 月 31 日', () => {
      const ts = new Date(2024, 11, 31, 23, 59).getTime();
      expect(formatDate(ts)).toBe('2024-12-31');
    });
  });

  describe('formatDateTime', () => {
    it('应格式化为 YYYY-MM-DD HH:mm', () => {
      const ts = new Date(2025, 5, 9, 8, 5).getTime(); // 2025-06-09 08:05
      expect(formatDateTime(ts)).toBe('2025-06-09 08:05');
    });

    it('应对时/分补零', () => {
      const ts = new Date(2025, 0, 1, 0, 0).getTime(); // 2025-01-01 00:00
      expect(formatDateTime(ts)).toBe('2025-01-01 00:00');
    });
  });

  describe('formatDuration', () => {
    it('应格式化秒为 mm:ss', () => {
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(599)).toBe('09:59');
    });

    it('应在超过 1 小时后格式化为 hh:mm:ss', () => {
      expect(formatDuration(3661)).toBe('01:01:01');
      expect(formatDuration(36000)).toBe('10:00:00');
    });

    it('应对负数取 0', () => {
      expect(formatDuration(-10)).toBe('00:00');
    });

    it('应向下取整小数秒', () => {
      expect(formatDuration(5.9)).toBe('00:05');
    });
  });

  describe('formatFileSize', () => {
    it('应格式化字节为 B', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('应格式化为 KB', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('应格式化为 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('应格式化为 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB');
    });
  });

  describe('formatRelativeTime', () => {
    const NOW = new Date(2025, 5, 15, 12, 0, 0).getTime(); // 2025-06-15 12:00

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应返回"刚刚"（小于 1 分钟）', () => {
      expect(formatRelativeTime(NOW - 30 * 1000)).toBe('刚刚');
      expect(formatRelativeTime(NOW - 1)).toBe('刚刚');
    });

    it('应返回"X 分钟前"', () => {
      expect(formatRelativeTime(NOW - 5 * ONE_MINUTE)).toBe('5 分钟前');
      expect(formatRelativeTime(NOW - 59 * ONE_MINUTE)).toBe('59 分钟前');
    });

    it('应返回"X 小时前"', () => {
      expect(formatRelativeTime(NOW - 2 * ONE_HOUR)).toBe('2 小时前');
      expect(formatRelativeTime(NOW - 23 * ONE_HOUR)).toBe('23 小时前');
    });

    it('应返回"昨天"（1~2 天）', () => {
      expect(formatRelativeTime(NOW - ONE_DAY - ONE_HOUR)).toBe('昨天');
      expect(formatRelativeTime(NOW - 1.5 * ONE_DAY)).toBe('昨天');
    });

    it('应返回"X 天前"（2~7 天）', () => {
      expect(formatRelativeTime(NOW - 3 * ONE_DAY)).toBe('3 天前');
      expect(formatRelativeTime(NOW - 6 * ONE_DAY)).toBe('6 天前');
    });

    it('超过 7 天应回退到 formatDate', () => {
      const ts = NOW - 10 * ONE_DAY;
      expect(formatRelativeTime(ts)).toBe(formatDate(ts));
    });
  });
});
