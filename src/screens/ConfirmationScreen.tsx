import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import AICommunicationService from '../services/AICommunicationService';
import TextToSpeechService from '../services/TextToSpeechService';

type Route = RouteProp<RootStackParamList, 'Confirmation'>;
type Navigation = StackNavigationProp<RootStackParamList, 'Confirmation'>;

export default function ConfirmationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const { phrase, recognizedText, confidence } = route.params;
  const analysis = AICommunicationService.analyze({
    originalPhrase: phrase,
    recognizedText,
    speechConfidence: confidence,
  });
  const [speaking, setSpeaking] = useState(false);

  const speak = async () => {
    setSpeaking(true);
    try {
      await TextToSpeechService.speak(analysis.correctedText);
    } catch {
      Alert.alert('Não foi possível falar', 'Tente novamente.');
    } finally {
      setSpeaking(false);
    }
  };

  const correct = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Confirme sua mensagem</Text>
      <Text style={styles.label}>FRASE ORIGINAL</Text>
      <Text accessible accessibilityLabel={`Frase original: ${phrase}`} style={styles.text}>{phrase}</Text>
      <Text style={styles.label}>O APLICATIVO ENTENDEU</Text>
      <Text accessible accessibilityLabel={`Texto entendido: ${analysis.correctedText || 'Nenhum texto reconhecido'}`} style={styles.text}>{analysis.correctedText || 'Nenhum texto reconhecido'}</Text>
      {analysis.explanation ? <Text accessibilityRole="text" style={styles.explanation}>{analysis.explanation}</Text> : null}
      <Text accessibilityRole="header" style={styles.question}>{analysis.needsConfirmation ? 'Está correto?' : 'Confira a mensagem:'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Sim, falar" accessibilityHint="Fala o texto reconhecido em português do Brasil" onPress={speak} style={[styles.button, styles.confirm]} disabled={speaking}>
        <Text style={styles.buttonText}>{speaking ? '🔊 FALANDO...' : '🗣️ SIM — FALAR'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Não, corrigir" accessibilityHint="Volta para editar ou falar uma nova mensagem" onPress={correct} style={[styles.button, styles.retry]}>
        <Text style={styles.buttonText}>✎ NÃO — CORRIGIR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', justifyContent: 'center', padding: 24 },
  title: { color: '#102A43', fontSize: 28, fontWeight: '800', marginBottom: 24 },
  label: { color: '#486581', fontSize: 15, fontWeight: '800', letterSpacing: 1, marginTop: 16 },
  text: { backgroundColor: '#102A43', borderRadius: 8, color: '#FFFFFF', fontSize: 22, lineHeight: 30, marginTop: 8, padding: 18 },
  question: { color: '#243B53', fontSize: 21, fontWeight: '700', marginVertical: 24 },
  explanation: { color: '#486581', fontSize: 17, lineHeight: 24, marginTop: 12 },
  button: { alignItems: 'center', borderRadius: 12, marginTop: 12, minHeight: 68, justifyContent: 'center', padding: 16 },
  confirm: { backgroundColor: '#147D64' },
  retry: { backgroundColor: '#B42318' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
});