/**
 * @file utils/logger.ts
 * @description 统一日志工具。开发环境打印到控制台，生产环境屏蔽。
 *              所有日志带统一前缀 [BiLing]，便于筛选。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const TAG = '[BiLing]';
const IS_DEV = __DEV__;

/**
 * 输出日志（内部方法）。
 * @param level 日志级别
 * @param args 日志参数
 */
function log(level: LogLevel, ...args: unknown[]): void {
  if (!IS_DEV && (level === 'debug' || level === 'info')) {
    return;
  }
  const prefix = `${TAG} ${level.toUpperCase()}`;
  switch (level) {
    case 'debug':
      console.debug(prefix, ...args);
      break;
    case 'info':
      console.info(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    case 'error':
      console.error(prefix, ...args);
      break;
    default:
      console.log(prefix, ...args);
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};

export default logger;
