import React, { useEffect, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ConversationService, { type ConversationMessage } from '../services/ConversationService';
import { loadContextualPhrases } from '../services/PersonalVoiceService';
import LibrasRecognitionService from '../services/LibrasRecognitionService';
import LibrasTranslationService from '../services/LibrasTranslationService';
import SpeechRecognitionService from '../services/SpeechRecognitionService';
import TextToSpeechService from '../services/TextToSpeechService';

type CameraState = 'off' | 'starting' | 'active' | 'paused';

export default function LibrasConversationScreen() {
    const navigation = useNavigation();
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraState, setCameraState] = useState<CameraState>('off');
    const [cameraMessage, setCameraMessage] = useState('Câmera desligada.');
    const [cameraError, setCameraError] = useState('');
    const [deafText, setDeafText] = useState('');
    const [hearingText, setHearingText] = useState('');
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Use texto ou voz se a câmera não estiver disponível.');
    const [recognitionMessage, setRecognitionMessage] = useState('');
    const [translationMessage, setTranslationMessage] = useState('');
    const isFocused = useIsFocused();

    useEffect(() => () => {
        SpeechRecognitionService.cancelListening();
        void TextToSpeechService.stop();
    }, []);

    useEffect(() => {
        if (!isFocused) {
            setCameraState((state) => state === 'active' || state === 'starting' ? 'paused' : state);
            if (isListening) {
                SpeechRecognitionService.cancelListening();
                setIsListening(false);
            }
        }
    }, [isFocused, isListening]);

    const startCamera = async () => {
        setCameraError('');
        setCameraState('starting');
        setCameraMessage('Solicitando permissão para acessar a câmera...');
        try {
            const result = permission?.granted ? permission : await requestPermission();
            if (!result.granted) {
                setCameraState('off');
                setCameraMessage('Câmera desligada. Você pode continuar por texto ou voz.');
                setCameraError('Permissão da câmera negada. Autorize o acesso nas configurações ou use texto e voz.');
                return;
            }
            setCameraMessage('Permissão concedida. Abrindo a prévia local...');
            setStatusMessage('Aguardando a câmera iniciar. Nenhuma imagem é gravada ou enviada.');
        } catch {
            setCameraState('off');
            setCameraMessage('Não foi possível abrir a câmera.');
            setCameraError('Câmera indisponível. Confira as permissões ou continue por texto e voz.');
        }
    };

    const pauseCamera = () => {
        setCameraState('paused');
        setCameraMessage('Câmera pausada.');
    };

    const endCamera = () => {
        setCameraState('off');
        setCameraError('');
        setCameraMessage('Câmera desligada.');
    };

    const checkForSignRecognition = async () => {
        const result = await LibrasRecognitionService.recognize();
        setRecognitionMessage(result.message);
    };

    const sendDeafText = () => {
        if (!deafText.trim()) {
            setStatusMessage('Digite uma mensagem antes de enviar.');
            return;
        }
        setMessages((current) => ConversationService.addMessage(current, ConversationService.createMessage('user', deafText)));
        setDeafText('');
        setStatusMessage('Mensagem adicionada à conversa.');
    };

    const sendHearingText = () => {
        if (!hearingText.trim()) {
            setStatusMessage('Digite ou dite uma resposta antes de enviar.');
            return;
        }
        setMessages((current) => ConversationService.addMessage(current, ConversationService.createMessage('other', hearingText)));
        setTranslationMessage(LibrasTranslationService.translate(hearingText).message);
        setHearingText('');
        setStatusMessage('Resposta adicionada à conversa. A tradução visual em Libras não está disponível.');
    };

    const startVoiceInput = async () => {
        setStatusMessage('Solicitando permissão do microfone...');
        try {
            if (!await SpeechRecognitionService.isAvailable()) {
                setStatusMessage('Reconhecimento de voz indisponível. Você ainda pode digitar a resposta.');
                return;
            }
            const permissionResult = await SpeechRecognitionService.requestPermission();
            if (!permissionResult.granted) {
                setStatusMessage('Permissão do microfone negada. Você ainda pode digitar a resposta.');
                return;
            }
            setIsListening(true);
            setStatusMessage('Ouvindo a resposta. Fale agora.');
            const contextualPhrases = await loadContextualPhrases();
            SpeechRecognitionService.startListening(
                ({ text, isFinal }) => {
                    setHearingText(text);
                    if (isFinal) {
                        setIsListening(false);
                        setStatusMessage('Fala reconhecida. Revise o texto antes de enviar.');
                    }
                },
                () => {
                    setIsListening(false);
                    setStatusMessage('Não foi possível reconhecer a fala. Digite a resposta ou tente novamente.');
                },
                () => setIsListening(false),
                contextualPhrases,
            );
        } catch {
            setIsListening(false);
            setStatusMessage('Não foi possível iniciar o microfone. Você ainda pode digitar a resposta.');
        }
    };

    const speakMessage = async (text: string) => {
        try {
            await TextToSpeechService.speak(text);
        } catch {
            setStatusMessage('Não foi possível reproduzir esta mensagem em voz alta.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.content} style={styles.container}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar à tela inicial" onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← VOLTAR</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>Conversar em Libras</Text>
            <Text accessibilityLiveRegion="polite" style={styles.status}>{statusMessage}</Text>

            <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Pessoa surda — Libras</Text>
                <Text style={styles.instruction}>Enquadre o rosto e mantenha as mãos visíveis diante da câmera. A câmera mostra apenas uma prévia local.</Text>
                <Text accessibilityLiveRegion="polite" style={styles.cameraStatus}>
                    {cameraState === 'starting' ? 'Abrindo câmera' : cameraState === 'active' ? 'Câmera ligada' : cameraState === 'paused' ? 'Câmera pausada' : 'Câmera desligada'}
                </Text>
                {(cameraState === 'starting' || cameraState === 'active') && isFocused ? (
                    <CameraView
                        accessibilityLabel="Prévia da câmera para sinais em Libras"
                        facing="front"
                        onCameraReady={() => {
                            setCameraState('active');
                            setCameraMessage('Câmera ligada. Posicione as mãos e o rosto dentro da área visível.');
                            setStatusMessage('A prévia fica neste dispositivo. Nenhuma imagem é gravada ou enviada.');
                        }}
                        onMountError={({ message }) => {
                            setCameraState('off');
                            setCameraMessage('Não foi possível abrir a câmera.');
                            setCameraError(`Câmera indisponível: ${message}. Você pode continuar por texto ou voz.`);
                        }}
                        style={styles.cameraPreview}
                    />
                ) : (
                    <View accessibilityLabel={cameraMessage} style={styles.cameraPlaceholder}>
                        <Text style={styles.cameraPlaceholderText}>{cameraMessage}</Text>
                    </View>
                )}
                {cameraError ? <Text accessibilityRole="alert" style={styles.error}>{cameraError}</Text> : null}
                <View style={styles.buttonGroup}>
                    {cameraState === 'off' ? (
                        <ActionButton label="Iniciar câmera" title="▶ INICIAR CÂMERA" onPress={startCamera} />
                    ) : null}
                    {cameraState === 'active' ? (
                        <ActionButton label="Pausar câmera" title="Ⅱ PAUSAR CÂMERA" onPress={pauseCamera} />
                    ) : null}
                    {cameraState === 'paused' ? (
                        <ActionButton label="Retomar câmera" title="▶ RETOMAR CÂMERA" onPress={() => setCameraState('active')} />
                    ) : null}
                    {cameraState !== 'off' ? (
                        <ActionButton label="Encerrar câmera" title="■ ENCERRAR CÂMERA" onPress={endCamera} variant="secondary" />
                    ) : null}
                </View>
                <ActionButton label="Verificar disponibilidade do reconhecimento" title="STATUS DO RECONHECIMENTO" onPress={checkForSignRecognition} variant="secondary" />
                {recognitionMessage ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{recognitionMessage}</Text> : null}
                <Text style={styles.subheading}>Alternativa por texto</Text>
                <TextInput
                    accessibilityLabel="Mensagem da pessoa surda"
                    multiline
                    onChangeText={setDeafText}
                    placeholder="Digite a mensagem da pessoa surda..."
                    placeholderTextColor="#52616B"
                    style={styles.input}
                    value={deafText}
                />
                <ActionButton label="Enviar mensagem da pessoa surda" title="ENVIAR MENSAGEM" onPress={sendDeafText} />
            </View>

            <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Pessoa ouvinte — português</Text>
                <TextInput
                    accessibilityLabel="Resposta em português"
                    multiline
                    onChangeText={setHearingText}
                    placeholder="Digite ou dite uma resposta em português..."
                    placeholderTextColor="#52616B"
                    style={styles.input}
                    value={hearingText}
                />
                <View style={styles.buttonGroup}>
                    <ActionButton
                        label={isListening ? 'Parar reconhecimento de voz' : 'Falar resposta ao microfone'}
                        title={isListening ? '■ PARAR DE OUVIR' : 'MICROFONE: DITAR RESPOSTA'}
                        onPress={isListening ? () => {
                            SpeechRecognitionService.stopListening();
                            setIsListening(false);
                            setStatusMessage('Reconhecimento encerrado. Revise o texto antes de enviar.');
                        } : startVoiceInput}
                        variant="secondary"
                    />
                    <ActionButton label="Enviar resposta da pessoa ouvinte" title="ENVIAR RESPOSTA" onPress={sendHearingText} />
                </View>
                <Text style={styles.notice}>
                    {translationMessage || 'Tradução visual em Libras indisponível: ainda não há tradução validada nem vídeos de sinais para esta mensagem.'}
                </Text>
            </View>

            <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Conversa</Text>
                {messages.length === 0 ? <Text style={styles.emptyState}>As mensagens enviadas aparecerão aqui, identificadas por pessoa.</Text> : null}
                {messages.map((item) => {
                    const sender = item.sender === 'user' ? 'Pessoa surda' : 'Pessoa ouvinte';
                    return (
                        <View accessible accessibilityLabel={`${sender}: ${item.text}`} key={item.id} style={[styles.message, item.sender === 'user' ? styles.deafMessage : styles.hearingMessage]}>
                            <Text style={styles.sender}>{sender}</Text>
                            <Text style={styles.messageText}>{item.text}</Text>
                            {item.sender === 'other' ? <Text style={styles.messageNotice}>{LibrasTranslationService.translate(item.text).message}</Text> : null}
                            <ActionButton label={`Reproduzir mensagem de ${sender}`} title="🔊 REPRODUZIR" onPress={() => speakMessage(item.text)} variant="text" />
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

function ActionButton({
    label,
    title,
    onPress,
    variant = 'primary',
}: {
    label: string;
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'text';
}) {
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.button, styles[`${variant}Button`]]}>
            <Text style={[styles.buttonText, variant === 'text' && styles.textButtonText]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },
    content: { flexGrow: 1, padding: 20, gap: 16 },
    title: { color: '#102A43', fontSize: 30, fontWeight: '800' },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
    backButtonText: { color: '#102A43', fontSize: 16, fontWeight: '800' },
    status: { color: '#243B53', fontSize: 17, lineHeight: 24 },
    section: { borderTopColor: '#BCCCDC', borderTopWidth: 1, gap: 12, paddingTop: 18 },
    sectionTitle: { color: '#102A43', fontSize: 23, fontWeight: '800' },
    instruction: { color: '#243B53', fontSize: 17, lineHeight: 24 },
    cameraStatus: { color: '#102A43', fontSize: 17, fontWeight: '800' },
    cameraPreview: { backgroundColor: '#172B36', borderRadius: 8, height: 300, overflow: 'hidden', width: '100%' },
    cameraPlaceholder: { alignItems: 'center', backgroundColor: '#DCE5E8', borderRadius: 8, height: 180, justifyContent: 'center', padding: 20 },
    cameraPlaceholderText: { color: '#243B53', fontSize: 17, lineHeight: 24, textAlign: 'center' },
    error: { color: '#A61B1B', fontSize: 16, lineHeight: 23 },
    buttonGroup: { gap: 10 },
    button: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 58, paddingHorizontal: 16, paddingVertical: 12 },
    primaryButton: { backgroundColor: '#007C91' },
    secondaryButton: { backgroundColor: '#486581' },
    textButton: { alignSelf: 'flex-start', backgroundColor: 'transparent', minHeight: 46, paddingHorizontal: 4 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center' },
    textButtonText: { color: '#102A43' },
    notice: { backgroundColor: '#FFF2CC', borderLeftColor: '#A66A00', borderLeftWidth: 4, color: '#3D3218', fontSize: 16, lineHeight: 23, padding: 12 },
    subheading: { color: '#102A43', fontSize: 18, fontWeight: '700', marginTop: 4 },
    input: { backgroundColor: '#FFFFFF', borderColor: '#486581', borderRadius: 8, borderWidth: 2, color: '#102A43', fontSize: 19, minHeight: 96, padding: 14, textAlignVertical: 'top' },
    emptyState: { color: '#52616B', fontSize: 17, lineHeight: 24 },
    message: { borderRadius: 8, marginTop: 4, padding: 14 },
    deafMessage: { backgroundColor: '#D9F0EE', borderLeftColor: '#147D64', borderLeftWidth: 5 },
    hearingMessage: { backgroundColor: '#E6F4FE', borderLeftColor: '#007C91', borderLeftWidth: 5 },
    sender: { color: '#102A43', fontSize: 15, fontWeight: '800' },
    messageText: { color: '#102A43', fontSize: 19, lineHeight: 27, marginTop: 6 },
    messageNotice: { color: '#3D3218', fontSize: 15, lineHeight: 22, marginTop: 8 },
});