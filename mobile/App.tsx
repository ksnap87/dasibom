/**
 * Tulip — Senior Dating App
 * Root component: loads session then renders AppNavigator.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const { loadSession, isAuthenticated, setProfile } = useAuthStore();

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
  }, [isAuthenticated, setProfile]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F5" />
      <AppNavigator />
    </>
  );
}
