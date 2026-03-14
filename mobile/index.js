/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import { TextDecoder, TextEncoder } from 'text-encoding';
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// 개발 중 경고 배너 비활성화 (UI 테스트용)
LogBox.ignoreAllLogs();

AppRegistry.registerComponent(appName, () => App);
