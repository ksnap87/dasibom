import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';

import ErrorBoundary from '../components/ErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { useFontStore } from '../store/fontStore';
import { registerFCMToken, onTokenRefresh, onForegroundMessage } from '../services/fcm';
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import SuggestionsScreen from '../screens/SuggestionsScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import CreditStoreScreen from '../screens/CreditStoreScreen';
import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const C = { primary: '#E8556D', sub: '#999' };

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <AppText style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.6 }}>{emoji}</AppText>;
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Suggestions"
        component={SuggestionsScreen}
        options={{
          tabBarLabel: '추천',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌸" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarLabel: '채팅',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💌" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '내 프로필',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigatorInner() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const { loadFontSize } = useFontStore();
  const [splashDone, setSplashDone] = React.useState(false);
  const [welcomeDone, setWelcomeDone] = React.useState(false);
  const [offline, setOffline] = useState(false);
  const fcmRegistered = useRef(false);

  // 글씨 크기 설정 로드
  useEffect(() => { loadFontSize(); }, [loadFontSize]);

  // Simple connectivity check on mount
  useEffect(() => {
    let mounted = true;
    fetch('https://clients3.google.com/generate_204', { method: 'HEAD' })
      .then(() => { if (mounted) setOffline(false); })
      .catch(() => { if (mounted) setOffline(true); });
    return () => { mounted = false; };
  }, []);

  // 기존 회원(설문 완료)이면 환영 화면 스킵
  useEffect(() => {
    if (profile?.questionnaire_completed) {
      setWelcomeDone(true);
    }
  }, [profile]);

  // 로그아웃 시 FCM 등록 상태 리셋
  useEffect(() => {
    if (!isAuthenticated) fcmRegistered.current = false;
  }, [isAuthenticated]);

  // FCM 토큰 등록 + 포그라운드 메시지 수신
  useEffect(() => {
    if (!isAuthenticated || !profile || fcmRegistered.current) return;
    fcmRegistered.current = true;

    registerFCMToken().catch(() => {});
    const unsubRefresh = onTokenRefresh();
    const unsubMessage = onForegroundMessage((title, body) => {
      Alert.alert(title, body);
    });

    return () => {
      if (typeof unsubRefresh === 'function') unsubRefresh();
      if (typeof unsubMessage === 'function') unsubMessage();
    };
  }, [isAuthenticated, profile]);

  // 로딩 중에는 스플래시 표시 (프로필 로드 완료까지 대기)
  if (isLoading && !splashDone) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F5' }}>
        <AppText style={{ fontSize: 48, marginBottom: 20 }}>🌸</AppText>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // 인증됐지만 프로필 로딩 중 → 로딩 화면 표시 (설문 화면 깜빡임 방지)
  if (splashDone && isAuthenticated && profile === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F5' }}>
        <AppText style={{ fontSize: 48, marginBottom: 20 }}>🌸</AppText>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <>
      {offline && (
        <View style={offlineStyles.banner}>
          <AppText style={offlineStyles.text}>인터넷 연결을 확인해 주세요</AppText>
        </View>
      )}
      <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerBackTitle: '뒤로' }}>
        {!splashDone ? (
          <Stack.Screen name="Splash" options={{ headerShown: false }}>
            {() => <SplashScreen onFinish={() => setSplashDone(true)} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : !profile?.questionnaire_completed && !welcomeDone ? (
          /* 신규 회원: 환영 화면 */
          <Stack.Screen name="Welcome" options={{ headerShown: false }}>
            {() => <WelcomeScreen onStart={() => setWelcomeDone(true)} />}
          </Stack.Screen>
        ) : !profile?.questionnaire_completed ? (
          /* 환영 화면 후: 설문 */
          <Stack.Screen
            name="Questionnaire"
            component={QuestionnaireScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={({ route }) => ({
                title: route.params.other_name,
                headerStyle: { backgroundColor: '#FFF8F5' },
                headerTintColor: '#E8556D',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
              })}
            />
            <Stack.Screen
              name="PhoneVerification"
              component={PhoneVerificationScreen}
              options={{
                title: '본인인증',
                headerStyle: { backgroundColor: '#FFF8F5' },
                headerTintColor: '#E8556D',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
              }}
            />
            <Stack.Screen
              name="QuestionnaireEdit"
              component={QuestionnaireScreen}
              options={{
                title: '가치관 수정',
                headerStyle: { backgroundColor: '#FFF8F5' },
                headerTintColor: '#E8556D',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
              }}
            />
            <Stack.Screen
              name="CreditStore"
              component={CreditStoreScreen}
              options={{
                title: '크레딧 충전',
                headerStyle: { backgroundColor: '#FFF8F5' },
                headerTintColor: '#E8556D',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
              }}
            />
            <Stack.Screen
              name="FriendProfile"
              component={FriendProfileScreen}
              options={({ route }) => ({
                title: route.params.other_name,
                headerStyle: { backgroundColor: '#FFF8F5' },
                headerTintColor: '#E8556D',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}

const offlineStyles = StyleSheet.create({
  banner: {
    backgroundColor: '#E53935',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default function AppNavigator() {
  return (
    <ErrorBoundary>
      <AppNavigatorInner />
    </ErrorBoundary>
  );
}
