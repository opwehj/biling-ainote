/**
 * Jest 全局 setup。
 * 定义 React Native 运行时全局变量，屏蔽无关日志噪音。
 */

// React Native 依赖的 __DEV__ 全局
(global as any).__DEV__ = true;

// 屏蔽 logger 噪音（可选保留 error）
const noop = () => {};
(global as any).console = {
  ...console,
  debug: noop,
  info: noop,
  log: noop,
  // 保留 warn / error 以便排查
};

// jest-native 扩展（如需组件测试时可用）
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@testing-library/jest-native/extend-expect');
} catch {
  // 组件测试未启用时忽略
}
