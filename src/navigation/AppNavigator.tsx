import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';
import LibrasConversationScreen from '../screens/LibrasConversationScreen';
import PersonalVoiceScreen from '../screens/PersonalVoiceScreen';

export type RootStackParamList = {
  Home: undefined;
  Confirmation: { phrase: string; recognizedText: string; confidence: number };
  LibrasConversation: undefined;
  PersonalVoice: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
      <Stack.Screen name="LibrasConversation" component={LibrasConversationScreen} />
      <Stack.Screen name="PersonalVoice" component={PersonalVoiceScreen} />
    </Stack.Navigator>
  );
}