/**
 * @file babel.config.js
 * @description Babel 配置，包含 React Native 预设与 reanimated 插件。
 *              reanimated 插件必须置于 plugins 数组最前。
 */

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
  ],
};
