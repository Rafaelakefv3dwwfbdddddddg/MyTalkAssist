import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowY = '';
      document.body.style.overflowX = '';
    };
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
