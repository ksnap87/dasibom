/**
 * 다시봄 — Senior Dating App
 * Root component: loads session then renders AppNavigator.
 */
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';

LogBox.ignoreAllLogs(true);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import ErrorBoundary from './src/components/ErrorBoundary';
import crashlytics from '@react-native-firebase/crashlytics';

// Unhandled Promise rejection 도 Crashlytics 로 리포트
// React Native 의 기본 동작은 console.warn 만 남기고 끝나므로, 프로덕션에서 놓치면 안 되는 백그라운드 에러를 수집.
if (!(globalThis as any).__dasibomRejectionHandlerInstalled) {
  (globalThis as any).__dasibomRejectionHandlerInstalled = true;
  const tracking = require('promise/setimmediate/rejection-tracking');
  tracking.enable({
    allRejections: true,
    onUnhandled: (_id: any, error: any) => {
      try {
        crashlytics().log('UnhandledRejection');
        crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
      } catch (_) {}
      console.warn('[UnhandledRejection]', error);
    },
  });
}

export default function App() {
  const { loadSession, isAuthenticated, setProfile, user } = useAuthStore();

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // After login, try to fetch profile so questionnaire_completed is known
  useEffect(() => {
    if (!isAuthenticated) return;
    import('./src/api/client').then(({ getMyProfile }) => {
      getMyProfile()
        .then(setProfile)
        .catch(() => setProfile(null)); // no profile yet → questionnaire
    });

    // 연락처 동기화 (지인 추천 제외용) — 백그라운드 실행
    import('./src/utils/contactSync').then(({ syncContacts }) => {
      syncContacts().catch(() => {});
    });
  }, [isAuthenticated, setProfile]);

  // Crashlytics 에 user id 연결 (크래시 수사에 도움, 개인정보 아님)
  useEffect(() => {
    try {
      if (user?.id) {
        crashlytics().setUserId(user.id);
      }
    } catch (_) {}
  }, [user?.id]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF8F5" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
