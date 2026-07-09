/**
 * @file index.js
 * @description React Native 应用入口。注册根组件 App。
 *              启用 GestureHandlerRootView 以支持手势导航。
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
