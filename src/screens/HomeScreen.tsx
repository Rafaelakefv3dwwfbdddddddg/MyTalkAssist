import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SpeechRecognitionService from '../services/SpeechRecognitionService';
import TextToSpeechService from '../services/TextToSpeechService';
import AICommunicationService, { type AICommunicationAnalysis } from '../services/AICommunicationService';
import ConversationService, { type ConversationMessage } from '../services/ConversationService';

const INITIAL_READ_PHRASE = 'Eu quero beber água.';

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'read' | 'message' | 'response' | null>(null);
  const [conversationMode, setConversationMode] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [responseAnalysis, setResponseAnalysis] = useState<AICommunicationAnalysis | null>(null);
  const [message, setMessage] = useState('Pronto para ouvir.');
  const [readPhraseText, setReadPhraseText] = useState(INITIAL_READ_PHRASE);
  const [recognizedText, setRecognizedText] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [readAnalysis, setReadAnalysis] = useState<AICommunicationAnalysis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  useEffect(() => () => {
    SpeechRecognitionService.cancelListening();
    TextToSpeechService.stop();
  }, []);

  const startReadRecognition = async () => {
    if (!readPhraseText.trim()) {
      setMessage('Digite uma frase antes de iniciar o reconhecimento.');
      return;
    }
    setMessage('Solicitando permissão do microfone...');
    try {
      if (!SpeechRecognitionService.isAvailable()) {
        setMessage('Reconhecimento de voz indisponível neste dispositivo.');
        return;
      }
      const permission = await SpeechRecognitionService.requestPermission();
      if (!permission.granted) {
        setMessage('Permissão do microfone negada. Verifique as configurações do dispositivo.');
        return;
      }
      setIsListening(true);
      setListeningTarget('read');
      setMessage('Ouvindo. Leia a frase em voz alta.');
      AccessibilityInfo.announceForAccessibility('Ouvindo. Leia a frase em voz alta.');
      SpeechRecognitionService.startListening(
        ({ text, confidence, isFinal }) => {
          if (!isFinal) {
            setRecognizedText(text);
            setMessage(`Ouvindo: ${text}`);
            return;
          }
          setIsListening(false);
          setListeningTarget(null);
          setRecognizedText(text);
          setReadAnalysis(AICommunicationService.analyze({ originalPhrase: readPhraseText, recognizedText: text, speechConfidence: confidence }));
          setMessage('Fala reconhecida. Confira a análise.');
          if (!text.trim()) {
            setMessage('Não consegui entender sua fala. Tente novamente.');
            return;
          }
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Não consegui entender sua fala. Tente novamente.');
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Nenhuma fala foi reconhecida. Tente novamente.');
        },
      );
    } catch {
      setIsListening(false);
      setMessage('O reconhecimento falhou. Tente novamente.');
    }
  };

  const stopRecognition = () => {
    const target = listeningTarget;
    SpeechRecognitionService.stopListening();
    setIsListening(false);
    setListeningTarget(null);
    setMessage(target === 'read' ? 'Reconhecimento encerrado.' : 'Finalizando reconhecimento...');
  };

  const mergeRecognizedText = (baseText: string, recognizedText: string) => {
    const recognized = recognizedText.trim();
    const base = baseText.trim();
    if (!recognized || !base) return recognized || base;

    const normalizedBase = base.toLocaleLowerCase('pt-BR');
    const normalizedRecognized = recognized.toLocaleLowerCase('pt-BR');
    if (normalizedRecognized === normalizedBase || normalizedRecognized.startsWith(`${normalizedBase} `)) {
      return recognized;
    }
    if (normalizedBase.endsWith(normalizedRecognized)) {
      return base;
    }
    return `${base} ${recognized}`;
  };

  const startMessageRecognition = async () => {
    const baseText = typedMessage;
    setMessage('Solicitando permissão do microfone...');
    try {
      if (!SpeechRecognitionService.isAvailable()) {
        setMessage('Reconhecimento de voz indisponível neste dispositivo. Você ainda pode digitar.');
        return;
      }
      const permission = await SpeechRecognitionService.requestPermission();
      if (!permission.granted) {
        setMessage('Permissão do microfone negada. Você ainda pode digitar sua mensagem.');
        return;
      }

      setIsListening(true);
      setListeningTarget('message');
      setMessage('Estou ouvindo. Fale agora.');
      AccessibilityInfo.announceForAccessibility('Estou ouvindo. Fale agora.');
      SpeechRecognitionService.startListening(
        ({ text, isFinal }) => {
          setTypedMessage(mergeRecognizedText(baseText, text));
          setMessage(isFinal ? 'Reconhecimento encerrado. Você pode editar a mensagem.' : '🔴 OUVINDO...');
          if (isFinal) {
            setIsListening(false);
            setListeningTarget(null);
          }
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Não foi possível reconhecer sua voz. Tente novamente.');
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Nenhum texto foi reconhecido. Tente novamente.');
        },
      );
    } catch {
      setIsListening(false);
      setListeningTarget(null);
      setMessage('Não foi possível reconhecer sua voz. Tente novamente.');
    }
  };

  const startResponseRecognition = async () => {
    setResponseAnalysis(null);
    setMessage('Solicitando permissão do microfone...');
    try {
      if (!SpeechRecognitionService.isAvailable()) {
        setMessage('Reconhecimento de voz indisponível. Você ainda pode digitar.');
        return;
      }
      const permission = await SpeechRecognitionService.requestPermission();
      if (!permission.granted) {
        setMessage('Permissão do microfone negada.');
        return;
      }
      setIsListening(true);
      setListeningTarget('response');
      setMessage('Estou ouvindo a resposta. Fale agora.');
      SpeechRecognitionService.startListening(
        ({ text, confidence, isFinal }) => {
          if (!isFinal) {
            setMessage(`🔴 OUVINDO... ${text}`);
            return;
          }
          const analysis = AICommunicationService.analyze({
            originalPhrase: '',
            recognizedText: text,
            speechConfidence: confidence,
          });
          setResponseAnalysis(analysis);
          setConversation((messages) => ConversationService.addMessage(messages, ConversationService.createMessage('other', analysis.correctedText, 'processing', analysis.confidence)));
          setIsListening(false);
          setListeningTarget(null);
          setMessage(analysis.needsConfirmation ? 'Confirme o texto da resposta.' : 'Resposta recebida.');
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Não foi possível reconhecer a resposta. Tente novamente.');
        },
        () => {
          setIsListening(false);
          setListeningTarget(null);
          setMessage('Nenhuma resposta foi reconhecida. Tente novamente.');
        },
      );
    } catch {
      setIsListening(false);
      setListeningTarget(null);
      setMessage('Não foi possível reconhecer a resposta. Tente novamente.');
    }
  };

  const confirmResponse = () => {
    if (!responseAnalysis) return;
    setConversation((messages) => {
      const last = messages[messages.length - 1];
      return last ? ConversationService.updateMessage(messages, last.id, { status: 'confirmed' }) : messages;
    });
    setResponseAnalysis(null);
    setMessage('Resposta confirmada.');
  };

  const correctResponse = () => {
    const last = conversation[conversation.length - 1];
    if (last) setTypedMessage(last.text);
    setResponseAnalysis(null);
    setMessage('Edite a resposta no campo de mensagem.');
  };

  const sendMessage = () => {
    if (!typedMessage.trim()) {
      setMessage('Digite ou fale uma mensagem antes de enviar.');
      return;
    }
    setConversation((messages) => ConversationService.addMessage(messages, ConversationService.createMessage('user', typedMessage)));
    setMessage('Mensagem enviada.');
    AccessibilityInfo.announceForAccessibility('Mensagem enviada.');
  };

  const speakTypedText = async () => {
    const text = typedMessage.trim();
    if (!text) {
      setMessage('Digite uma mensagem antes de falar.');
      return;
    }

    setIsSpeaking(true);
    setMessage('Falando sua mensagem.');
    try {
      await TextToSpeechService.speak(text, speechRate);
      setConversation((messages) => ConversationService.addMessage(messages, ConversationService.createMessage('user', text, 'confirmed')));
      if (conversationMode) {
        setMessage('Mensagem falada. Agora você pode ouvir a resposta.');
        setIsSpeaking(false);
        await startResponseRecognition();
      } else {
        setMessage('Mensagem falada.');
      }
    } catch {
      setMessage('Não foi possível falar a mensagem. Tente novamente.');
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    await TextToSpeechService.stop();
    setIsSpeaking(false);
    setMessage('Fala interrompida.');
  };

  const clearTypedText = async () => {
    if (isSpeaking) {
      await TextToSpeechService.stop();
    }
    setTypedMessage('');
    setIsSpeaking(false);
    setMessage('Mensagem limpa.');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Comunicação Acessível</Text>
      <Text accessibilityRole="header" style={styles.sectionTitle}>PCD LÊ</Text>
      <TextInput
        accessibilityRole="text"
        accessibilityLabel="Campo da frase"
        accessibilityHint="Edite a frase que será usada no reconhecimento de voz"
        multiline
        onChangeText={setReadPhraseText}
        placeholder="Digite a frase para ler em voz alta..."
        placeholderTextColor="#627D98"
        style={styles.textInput}
        textAlignVertical="top"
        value={readPhraseText}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Limpar texto"
        accessibilityHint="Apaga todo o texto da mensagem"
        onPress={() => setReadPhraseText('')}
        style={[styles.button, styles.clearButton]}
      >
        <Text style={styles.buttonText}>🗑 LIMPAR</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isListening && listeningTarget === 'read' ? 'Parar de ouvir frase' : 'Ler frase em voz alta'}
        accessibilityHint={isListening && listeningTarget === 'read' ? 'Finaliza o reconhecimento' : 'Inicia o reconhecimento da sua leitura'}
        disabled={isListening && listeningTarget !== 'read'}
        onPress={isListening ? stopRecognition : startReadRecognition}
        style={[styles.button, isListening && styles.stopButton]}
      >
        <Text style={styles.buttonText}>{isListening && listeningTarget === 'read' ? '■ PARAR' : '🎤 LER EM VOZ ALTA'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.status}>{isListening ? '🔴 OUVINDO...' : message}</Text>
      {(recognizedText || readAnalysis) ? <View accessible accessibilityLabel={`Texto reconhecido: ${recognizedText || 'Nenhum texto reconhecido'}`} style={styles.analysisPanel}>
        <Text accessibilityRole="header" style={styles.analysisTitle}>TEXTO RECONHECIDO</Text>
        <Text style={styles.analysisText}>{recognizedText || 'Nenhum texto reconhecido'}</Text>
        {readAnalysis ? <>
          <Text accessibilityRole="header" style={styles.analysisTitle}>ANÁLISE DA IA</Text>
          <Text style={styles.analysisText}>{readAnalysis.correctedText}</Text>
          <Text style={styles.analysisExplanation}>{readAnalysis.explanation ?? 'Texto claro.'}</Text>
          <View style={styles.analysisActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirmar análise" accessibilityHint="Confirma o texto reconhecido sem iniciar o microfone" onPress={() => setMessage('Análise confirmada.')} style={[styles.button, styles.confirmButton]}>
              <Text style={styles.buttonText}>✅ CONFIRMAR</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Corrigir texto reconhecido" accessibilityHint="Coloca o texto reconhecido no campo da frase para edição" onPress={() => { setReadPhraseText(readAnalysis.correctedText); setMessage('Edite o texto da frase.'); }} style={[styles.button, styles.clearButton]}>
              <Text style={styles.buttonText}>✏️ CORRIGIR</Text>
            </Pressable>
          </View>
        </> : null}
      </View> : null}
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>PCD DIGITA</Text>
      <TextInput
        accessibilityRole="text"
        accessibilityLabel="Campo para digitar mensagem"
        accessibilityHint="Digite a mensagem que deseja falar"
        multiline
        onChangeText={setTypedMessage}
        placeholder="Digite sua mensagem..."
        placeholderTextColor="#627D98"
        style={styles.textInput}
        textAlignVertical="top"
        value={typedMessage}
      />
      <Text accessibilityLiveRegion="polite" style={styles.characterCount}>{typedMessage.length} caracteres</Text>
      <Text accessibilityRole="header" style={styles.speedLabel}>Velocidade da fala</Text>
      <View accessibilityRole="radiogroup" style={styles.speedRow}>
        {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`Velocidade ${rate} vezes`}
            accessibilityState={{ selected: speechRate === rate }}
            key={rate}
            onPress={() => setSpeechRate(rate)}
            style={[styles.speedButton, speechRate === rate && styles.selectedSpeedButton]}
          >
            <Text style={[styles.speedButtonText, speechRate === rate && styles.selectedSpeedButtonText]}>{rate}x</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.textActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isListening && listeningTarget === 'message' ? 'Parar reconhecimento de voz' : 'Falar mensagem por voz'}
          accessibilityHint={isListening && listeningTarget === 'message' ? 'Interrompe o reconhecimento e mantém o texto' : 'Toque para falar e transformar sua voz em texto'}
          disabled={isListening && listeningTarget !== 'message'}
          onPress={isListening && listeningTarget === 'message' ? stopRecognition : startMessageRecognition}
          style={[styles.button, styles.voiceButton, isListening && listeningTarget === 'message' && styles.stopButton]}
        >
          <Text style={styles.buttonText}>{isListening && listeningTarget === 'message' ? '🔴 OUVINDO...' : '🎤 FALAR'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isListening && listeningTarget === 'response' ? 'Parar de ouvir resposta' : 'Ouvir resposta'}
          accessibilityHint={isListening && listeningTarget === 'response' ? 'Interrompe a escuta' : 'Ouve a resposta da outra pessoa e transforma em texto'}
          disabled={isListening && listeningTarget !== 'response'}
          onPress={isListening && listeningTarget === 'response' ? stopRecognition : startResponseRecognition}
          style={[styles.button, styles.listenButton, isListening && listeningTarget === 'response' && styles.stopButton]}
        >
          <Text style={styles.buttonText}>{isListening && listeningTarget === 'response' ? '⏹ PARAR OUVIR' : '🎤 OUVIR RESPOSTA'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSpeaking ? 'Parar fala' : 'Falar texto'}
          accessibilityHint={isSpeaking ? 'Interrompe a leitura sem apagar o texto' : 'Lê exatamente o texto do campo em voz alta'}
          disabled={isListening}
          onPress={isSpeaking ? stopSpeaking : speakTypedText}
          style={[styles.button, styles.speakButton, isSpeaking && styles.stopButton]}
        >
          <Text style={styles.buttonText}>{isSpeaking ? '⏹ PARAR FALA' : '🔊 FALAR TEXTO'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar mensagem"
          accessibilityHint="Apaga apenas o texto digitado e interrompe a fala"
          onPress={clearTypedText}
          style={[styles.button, styles.clearButton]}
        >
          <Text style={styles.buttonText}>🗑 LIMPAR</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityHint="Envia a mensagem digitada ou reconhecida por voz"
          onPress={sendMessage}
          style={[styles.button, styles.sendButton]}
        >
          <Text style={styles.buttonText}>➤ ENVIAR</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Modo conversa"
        accessibilityHint="Ativa o fluxo de fala e resposta em várias mensagens"
        accessibilityState={{ checked: conversationMode }}
        onPress={() => setConversationMode((enabled) => !enabled)}
        style={[styles.button, styles.conversationButton]}
      >
        <Text style={styles.buttonText}>{conversationMode ? '💬 MODO CONVERSA ATIVO' : '💬 MODO CONVERSA'}</Text>
      </Pressable>
      {responseAnalysis ? <View accessible accessibilityLabel={`Resposta reconhecida: ${responseAnalysis.correctedText}`} style={styles.responsePanel}>
        <Text accessibilityRole="header" style={styles.responseTitle}>RESPOSTA RECONHECIDA</Text>
        <Text style={styles.responseText}>{responseAnalysis.correctedText || 'Nenhum texto reconhecido'}</Text>
        <Text style={styles.responseQuestion}>{responseAnalysis.needsConfirmation ? 'Está correto?' : 'Resposta clara. Confirme para continuar.'}</Text>
        <View style={styles.responseActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Sim, confirmar resposta" accessibilityHint="Confirma o texto sem falar automaticamente" onPress={confirmResponse} style={[styles.button, styles.confirmButton]}>
            <Text style={styles.buttonText}>✅ SIM</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Corrigir resposta" accessibilityHint="Coloca a resposta no campo para edição" onPress={correctResponse} style={[styles.button, styles.clearButton]}>
            <Text style={styles.buttonText}>✏️ CORRIGIR</Text>
          </Pressable>
        </View>
      </View> : null}
      <Text accessibilityRole="header" style={styles.conversationTitle}>CONVERSA</Text>
      {conversation.map((item) => <View accessible accessibilityLabel={`${item.sender === 'user' ? 'Você' : 'Outra pessoa'}: ${item.text}`} key={item.id} style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.otherBubble]}>
        <Text style={styles.sender}>{item.sender === 'user' ? '👤 VOCÊ' : '👥 OUTRA PESSOA'}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Reproduzir mensagem: ${item.text}`} accessibilityHint="Fala esta mensagem em voz alta" onPress={() => TextToSpeechService.speak(item.text, speechRate)} style={styles.replayButton}>
          <Text style={styles.replayText}>🔊 REPRODUZIR</Text>
        </Pressable>
      </View>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#102A43', fontSize: 30, fontWeight: '800', marginBottom: 20 },
  instruction: { color: '#243B53', fontSize: 20, marginBottom: 10 },
  button: { alignItems: 'center', backgroundColor: '#007C91', borderRadius: 12, minHeight: 72, justifyContent: 'center', padding: 18 },
  stopButton: { backgroundColor: '#B42318' },
  buttonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  status: { color: '#243B53', fontSize: 18, lineHeight: 26, marginTop: 20, textAlign: 'center' },
  divider: { backgroundColor: '#BCCCDC', height: 1, marginVertical: 28 },
  sectionTitle: { color: '#102A43', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  textInput: { backgroundColor: '#FFFFFF', borderColor: '#486581', borderRadius: 8, borderWidth: 2, color: '#102A43', fontSize: 21, minHeight: 120, padding: 16 },
  characterCount: { color: '#486581', fontSize: 16, marginTop: 6, textAlign: 'right' },
  speedLabel: { color: '#243B53', fontSize: 18, fontWeight: '700', marginTop: 16 },
  speedRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  speedButton: { alignItems: 'center', borderColor: '#486581', borderRadius: 8, borderWidth: 2, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 },
  selectedSpeedButton: { backgroundColor: '#102A43' },
  speedButtonText: { color: '#102A43', fontSize: 16, fontWeight: '700' },
  selectedSpeedButtonText: { color: '#FFFFFF' },
  textActions: { gap: 12, marginTop: 16 },
  speakButton: { backgroundColor: '#147D64' },
  voiceButton: { backgroundColor: '#007C91' },
  clearButton: { backgroundColor: '#627D98' },
  sendButton: { backgroundColor: '#102A43' },
  analysisPanel: { backgroundColor: '#E6F4FE', borderColor: '#007C91', borderRadius: 8, borderWidth: 2, marginTop: 18, padding: 18 },
  analysisTitle: { color: '#102A43', fontSize: 16, fontWeight: '800', marginTop: 8 },
  analysisText: { color: '#102A43', fontSize: 21, fontWeight: '700', lineHeight: 29, marginTop: 6 },
  analysisExplanation: { color: '#486581', fontSize: 17, lineHeight: 24, marginTop: 10 },
  analysisActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  listenButton: { backgroundColor: '#007C91' },
  conversationButton: { backgroundColor: '#486581', marginTop: 12 },
  responsePanel: { backgroundColor: '#E6F4FE', borderColor: '#007C91', borderRadius: 8, borderWidth: 2, marginTop: 20, padding: 18 },
  responseTitle: { color: '#102A43', fontSize: 16, fontWeight: '800' },
  responseText: { color: '#102A43', fontSize: 22, fontWeight: '700', lineHeight: 30, marginTop: 8 },
  responseQuestion: { color: '#243B53', fontSize: 18, fontWeight: '700', marginTop: 14 },
  responseActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  confirmButton: { backgroundColor: '#147D64', flex: 1 },
  conversationTitle: { color: '#102A43', fontSize: 22, fontWeight: '800', marginTop: 28 },
  messageBubble: { borderRadius: 8, marginTop: 12, padding: 16 },
  userBubble: { backgroundColor: '#D9F0EE', borderLeftColor: '#147D64', borderLeftWidth: 5 },
  otherBubble: { backgroundColor: '#E6F4FE', borderLeftColor: '#007C91', borderLeftWidth: 5 },
  sender: { color: '#102A43', fontSize: 15, fontWeight: '800' },
  messageText: { color: '#102A43', fontSize: 21, lineHeight: 29, marginTop: 8 },
  replayButton: { alignSelf: 'flex-start', marginTop: 12, minHeight: 42, paddingVertical: 8 },
  replayText: { color: '#102A43', fontSize: 16, fontWeight: '800' },
});