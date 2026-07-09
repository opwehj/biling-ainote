/**
 * 冒烟测试：验证 Jest 环境与模块解析正常。
 */
import { formatDate, formatDuration } from '../src/utils/date';
import { INPUT_LIMITS } from '../src/constants/config';

describe('jest environment smoke test', () => {
  it('should import and run pure utils', () => {
    expect(formatDate(0)).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(formatDuration(65)).toBe('01:05');
  });

  it('should resolve constants', () => {
    expect(INPUT_LIMITS.MAX_IMAGE_COUNT).toBe(9);
  });

  it('__DEV__ global is defined', () => {
    expect((global as any).__DEV__).toBe(true);
  });
});
