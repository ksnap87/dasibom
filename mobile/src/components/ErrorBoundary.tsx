import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import crashlytics from '@react-native-firebase/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // Crashlytics 로 JS 에러 리포트 — 네이티브 크래시와 달리 자동 수집되지 않으므로 수동 리포트
    try {
      crashlytics().log(`React componentStack: ${info.componentStack ?? 'n/a'}`);
      crashlytics().recordError(error);
    } catch (_) {
      // Crashlytics 초기화 실패는 조용히 무시 (앱 동작엔 영향 없음)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AppText style={styles.emoji}>🌸</AppText>
          <AppText style={styles.title}>앱에 문제가 발생했어요</AppText>
          <AppText style={styles.subtitle}>잠시 후 다시 시도해 주세요</AppText>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <AppText style={styles.buttonText}>다시 시도</AppText>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    padding: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#E8556D',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
