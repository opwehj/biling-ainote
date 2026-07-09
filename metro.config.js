/**
 * @file metro.config.js
 * @description Metro 打包配置，适配 bare React Native + Expo 模块。
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * 自定义配置：
 * - 支持 .cjs / .mjs 模块解析（部分 expo 依赖使用）
 * - 启用资产内联（小幅优化）
 */
const customConfig = {
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs', 'mjs'],
    assetExts: defaultConfig.resolver.assetExts,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);
