/**
 * @file utils/markdown.ts
 * @description Markdown 工具：提取摘要、字数统计、清理等。
 */

/**
 * 去除 Markdown 标记，提取纯文本（用于摘要/搜索）。
 * @param md Markdown 字符串
 * @param maxLen 最大长度
 */
export function markdownToPlainText(md: string, maxLen: number = 200): string {
  if (!md) return '';
  let text = md;
  // 移除标题标记
  text = text.replace(/^#{1,6}\s+/gm, '');
  // 移除图片
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // 移除链接，保留文本
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // 移除粗体/斜体
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  // 移除引用标记
  text = text.replace(/^>\s+/gm, '');
  // 移除列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  // 压缩空白
  text = text.replace(/\n{2,}/g, '\n').trim();

  if (text.length > maxLen) {
    return text.slice(0, maxLen) + '…';
  }
  return text;
}

/**
 * 统计 Markdown 正文字数（纯文本字符数，不含标记）。
 */
export function countWords(md: string): number {
  return markdownToPlainText(md, 100_000).length;
}

/**
 * 从 Markdown 提取首段作为预览摘要。
 */
export function extractPreview(md: string, maxLen: number = 100): string {
  const plain = markdownToPlainText(md, maxLen + 20);
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}
