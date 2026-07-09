/**
 * @file utils/id.ts
 * @description uuid 封装。提供统一 ID 生成方法，便于替换底层实现。
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 生成唯一 ID（基于 uuid v4）。
 * @returns 36 字符的 UUID 字符串
 */
export function generateId(): string {
  return uuidv4();
}

export default generateId;
