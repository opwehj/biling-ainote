/**
 * @file utils/date.ts
 * @description 时间格式化工具。提供相对时间、绝对时间、时长等格式化方法。
 */

/** 一分钟的毫秒数 */
const ONE_MINUTE = 60 * 1000;
/** 一小时的毫秒数 */
const ONE_HOUR = 60 * ONE_MINUTE;
/** 一天的毫秒数 */
const ONE_DAY = 24 * ONE_HOUR;

/**
 * 数字补零。
 */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 格式化为相对时间（如"刚刚"、"5 分钟前"、"昨天"）。
 * @param timestamp 毫秒时间戳
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < ONE_MINUTE) {
    return '刚刚';
  }
  if (diff < ONE_HOUR) {
    return `${Math.floor(diff / ONE_MINUTE)} 分钟前`;
  }
  if (diff < ONE_DAY) {
    return `${Math.floor(diff / ONE_HOUR)} 小时前`;
  }
  if (diff < 2 * ONE_DAY) {
    return '昨天';
  }
  if (diff < 7 * ONE_DAY) {
    return `${Math.floor(diff / ONE_DAY)} 天前`;
  }
  return formatDate(timestamp);
}

/**
 * 格式化为日期 YYYY-MM-DD。
 * @param timestamp 毫秒时间戳
 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 格式化为日期时间 YYYY-MM-DD HH:mm。
 * @param timestamp 毫秒时间戳
 */
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${formatDate(timestamp)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化时长（秒 → mm:ss 或 hh:mm:ss）。
 * @param seconds 秒数
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  }
  return `${pad(m)}:${pad(sec)}`;
}

/**
 * 格式化文件大小。
 * @param bytes 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
