import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuthStore } from '../store/authStore';
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import SuggestionsScreen from '../screens/SuggestionsScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const C = { primary: '#E8556D', sub: '#999' };

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 4 },
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

export default function AppNavigator() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const [splashDone, setSplashDone] = React.useState(false);

  // Show splash screen while loading session or for minimum 2 seconds
  if (isLoading && !splashDone) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F5' }}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>🌸</Text>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerBackTitle: '뒤로' }}>
        {!splashDone ? (
          <Stack.Screen name="Splash" options={{ headerShown: false }}>
            {() => <SplashScreen onFinish={() => setSplashDone(true)} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : !profile?.questionnaire_completed ? (
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
  );
}
