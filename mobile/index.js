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

// FCM 백그라운드 메시지 핸들러 (AppRegistry 전에 등록)
import { setBackgroundHandler } from './src/services/fcm';
setBackgroundHandler();

// 릴리즈 빌드에서만 경고 배너 비활성화
if (!__DEV__) {
  LogBox.ignoreAllLogs();
}

AppRegistry.registerComponent(appName, () => App);
