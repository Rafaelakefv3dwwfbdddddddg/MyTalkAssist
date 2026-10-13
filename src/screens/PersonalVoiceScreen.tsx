import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
    deletePersonalVoiceSample,
    getPersonalVoiceSamples,
    MAX_PERSONAL_VOICE_SAMPLES,
    MAX_PERSONAL_VOICE_PHRASE_LENGTH,
    savePersonalVoiceSample,
    updatePersonalVoicePhrase,
    type PersonalVoiceSample,
} from '../services/PersonalVoiceService';

const MAX_RECORDING_SECONDS = 8;

function SampleRow({
    sample,
    onDelete,
    onUpdate,
}: {
    sample: PersonalVoiceSample;
    onDelete: (id: string) => void;
    onUpdate: (id: string, phrase: string) => void;
}) {
    const player = useAudioPlayer(sample.audioUri);
    const playback = useAudioPlayerStatus(player);
    const [phrase, setPhrase] = useState(sample.phrase);

    useEffect(() => setPhrase(sample.phrase), [sample.phrase]);

    return (
        <View style={styles.sampleRow}>
            <TextInput
                accessibilityLabel="Frase confirmada desta gravação"
                maxLength={MAX_PERSONAL_VOICE_PHRASE_LENGTH}
                onChangeText={setPhrase}
                style={styles.sampleInput}
                value={phrase}
            />
            <View style={styles.sampleActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={playback.playing ? 'Pausar gravação' : 'Ouvir gravação'} onPress={() => playback.playing ? player.pause() : player.play()} style={[styles.actionButton, styles.playButton]}>
                    <Text style={styles.actionText}>{playback.playing ? 'PAUSAR' : 'OUVIR'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Salvar correção da frase" disabled={!phrase.trim()} onPress={() => onUpdate(sample.id, phrase)} style={[styles.actionButton, styles.saveButton]}>
                    <Text style={styles.actionText}>SALVAR CORREÇÃO</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Excluir gravação" onPress={() => onDelete(sample.id)} style={[styles.actionButton, styles.deleteButton]}>
                    <Text style={styles.actionText}>EXCLUIR</Text>
                </Pressable>
            </View>
        </View>
    );
}

export default function PersonalVoiceScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
    const recorderState = useAudioRecorderState(recorder, 200);
    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);
    const recordingStarted = useRef(false);
    const [samples, setSamples] = useState<PersonalVoiceSample[]>([]);
    const [phrase, setPhrase] = useState('');
    const [pendingUri, setPendingUri] = useState<string | null>(null);
    const [hasRecordingConsent, setHasRecordingConsent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('As gravações ficam somente neste dispositivo.');

    useEffect(() => {
        let mounted = true;
        void getPersonalVoiceSamples().then((saved) => {
            if (mounted) setSamples(saved);
        }).catch(() => {
            if (mounted) setStatus('Não foi possível carregar suas gravações.');
        });
        return () => {
            mounted = false;
            player.pause();
            if (recordingStarted.current) void recorder.stop();
        };
    }, [player, recorder]);

    useEffect(() => {
        if (recordingStarted.current && !recorderState.isRecording && recorder.uri) {
            recordingStarted.current = false;
            setPendingUri(recorder.uri);
            setStatus('Gravação pronta. Ouça e corrija a frase antes de salvar.');
        }
    }, [recorder.uri, recorderState.isRecording]);

    useEffect(() => {
        if (recorderState.isRecording && recorderState.durationMillis >= MAX_RECORDING_SECONDS * 1000) {
            void recorder.stop();
        }
    }, [recorder, recorderState.durationMillis, recorderState.isRecording]);

    const startRecording = async () => {
        if (!hasRecordingConsent) {
            setStatus('Confirme a autorização para gravar antes de continuar.');
            return;
        }
        if (!phrase.trim()) {
            setStatus('Digite a frase que você vai falar.');
            return;
        }
        if (samples.length >= MAX_PERSONAL_VOICE_SAMPLES) {
            setStatus(`O limite de ${MAX_PERSONAL_VOICE_SAMPLES} gravações foi atingido. Exclua uma para gravar outra.`);
            return;
        }

        try {
            const permission = await AudioModule.requestRecordingPermissionsAsync();
            if (!permission.granted) {
                setStatus('Permissão do microfone negada.');
                return;
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await recorder.prepareToRecordAsync();
            setPendingUri(null);
            recordingStarted.current = true;
            recorder.record({ forDuration: MAX_RECORDING_SECONDS });
            setStatus(`Gravando. Fale a frase; a gravação para em ${MAX_RECORDING_SECONDS} segundos.`);
        } catch {
            recordingStarted.current = false;
            setStatus('Não foi possível iniciar a gravação. Verifique a permissão do microfone.');
        }
    };

    const stopRecording = async () => {
        try {
            await recorder.stop();
        } catch {
            recordingStarted.current = false;
            setStatus('Não foi possível finalizar a gravação. Tente novamente.');
        }
    };

    const savePendingSample = async () => {
        if (!pendingUri || !phrase.trim()) return;
        setIsSaving(true);
        try {
            const updated = await savePersonalVoiceSample(phrase, pendingUri);
            setSamples(updated);
            setPendingUri(null);
            setPhrase('');
            setStatus('Gravação salva neste dispositivo e frase confirmada para viés de vocabulário.');
        } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Não foi possível salvar a gravação.');
        } finally {
            setIsSaving(false);
        }
    };

    const playPendingSample = () => {
        if (!pendingUri) return;
        player.replace(pendingUri);
        player.play();
    };

    const saveCorrection = async (id: string, correctedPhrase: string) => {
        try {
            setSamples(await updatePersonalVoicePhrase(id, correctedPhrase));
            setStatus('Frase corrigida e salva.');
        } catch {
            setStatus('Não foi possível salvar a correção.');
        }
    };

    const deleteSample = async (id: string) => {
        try {
            setSamples(await deletePersonalVoiceSample(id));
            setStatus('Gravação e frase excluídas deste dispositivo.');
        } catch {
            setStatus('Não foi possível excluir a gravação.');
        }
    };

    const discardPendingSample = async () => {
        if (!pendingUri) return;
        if (pendingUri.startsWith('file:')) {
            try {
                const { File } = await import('expo-file-system');
                const file = new File(pendingUri);
                if (file.exists) file.delete();
            } catch {
                setStatus('Não foi possível remover a gravação temporária.');
                return;
            }
        }
        setPendingUri(null);
        setStatus('Gravação temporária descartada.');
    };

    return (
        <ScrollView contentContainerStyle={styles.content} style={styles.container}>
            <Text accessibilityRole="header" style={styles.title}>Minha Voz</Text>
            <Text style={styles.privacy}>Áudios e frases permanecem neste dispositivo. Nada é enviado.</Text>
            <Text style={styles.disclosure}>As frases salvas podem enviesar o vocabulário no reconhecimento compatível. Isso não treina nem adapta o modelo acústico à sua voz.</Text>

            <Text accessibilityRole="header" style={styles.sectionTitle}>NOVA GRAVAÇÃO</Text>
            <TextInput
                accessibilityLabel="Frase que será gravada"
                multiline
                maxLength={MAX_PERSONAL_VOICE_PHRASE_LENGTH}
                onChangeText={setPhrase}
                placeholder="Digite uma palavra ou frase curta"
                placeholderTextColor="#627D98"
                style={styles.phraseInput}
                value={phrase}
            />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: hasRecordingConsent }} onPress={() => setHasRecordingConsent((consented) => !consented)} style={styles.consentRow}>
                <View style={[styles.checkbox, hasRecordingConsent && styles.checkboxChecked]}>
                    {hasRecordingConsent ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.consentText}>Autorizo esta gravação da minha voz ou tenho autorização de quem fala.</Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? 'Parar gravação' : 'Gravar frase'} accessibilityState={{ disabled: !hasRecordingConsent || !phrase.trim() || isSaving || Boolean(pendingUri) }} disabled={!hasRecordingConsent || !phrase.trim() || isSaving || Boolean(pendingUri)} onPress={recorderState.isRecording ? stopRecording : startRecording} style={[styles.button, recorderState.isRecording ? styles.stopButton : styles.recordButton, (!hasRecordingConsent || !phrase.trim() || isSaving || pendingUri) && styles.disabledButton]}>
                <Text style={styles.buttonText}>{recorderState.isRecording ? `PARAR · ${Math.max(0, MAX_RECORDING_SECONDS - Math.floor(recorderState.durationMillis / 1000))}s` : 'GRAVAR FRASE'}</Text>
            </Pressable>

            {pendingUri ? <View style={styles.pendingPanel}>
                <Text style={styles.pendingTitle}>PRÉVIA</Text>
                <Text style={styles.pendingPhrase}>{phrase}</Text>
                <View style={styles.sampleActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={playerStatus.playing ? 'Pausar prévia' : 'Ouvir prévia'} onPress={() => playerStatus.playing ? player.pause() : playPendingSample()} style={[styles.actionButton, styles.playButton]}>
                        <Text style={styles.actionText}>{playerStatus.playing ? 'PAUSAR' : 'OUVIR'}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Salvar amostra confirmada" disabled={isSaving} onPress={savePendingSample} style={[styles.actionButton, styles.saveButton]}>
                        <Text style={styles.actionText}>{isSaving ? 'SALVANDO...' : 'CONFIRMAR E SALVAR'}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Descartar prévia" onPress={discardPendingSample} style={[styles.actionButton, styles.deleteButton]}>
                        <Text style={styles.actionText}>DESCARTAR</Text>
                    </Pressable>
                </View>
            </View> : null}

            <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.status}>{status}</Text>
            <View style={styles.divider} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>GRAVAÇÕES SALVAS · {samples.length}/{MAX_PERSONAL_VOICE_SAMPLES}</Text>
            {samples.length ? samples.map((sample) => <SampleRow key={sample.id} sample={sample} onDelete={deleteSample} onUpdate={saveCorrection} />) : <Text style={styles.empty}>Nenhuma gravação salva.</Text>}
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={[styles.button, styles.backButton]}>
                <Text style={styles.buttonText}>VOLTAR PARA COMUNICAÇÃO</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },
    content: { flexGrow: 1, padding: 24 },
    title: { color: '#102A43', fontSize: 30, fontWeight: '800', marginBottom: 10 },
    privacy: { color: '#147D64', fontSize: 17, fontWeight: '700', lineHeight: 24 },
    disclosure: { color: '#486581', fontSize: 16, lineHeight: 23, marginTop: 8 },
    sectionTitle: { color: '#102A43', fontSize: 21, fontWeight: '800', marginBottom: 10, marginTop: 24 },
    phraseInput: { backgroundColor: '#FFFFFF', borderColor: '#486581', borderRadius: 8, borderWidth: 2, color: '#102A43', fontSize: 20, minHeight: 96, padding: 14, textAlignVertical: 'top' },
    consentRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 16, minHeight: 50 },
    checkbox: { alignItems: 'center', borderColor: '#486581', borderRadius: 4, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
    checkboxChecked: { backgroundColor: '#147D64', borderColor: '#147D64' },
    checkmark: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    consentText: { color: '#243B53', flex: 1, fontSize: 16, lineHeight: 23 },
    button: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 58, paddingHorizontal: 14, paddingVertical: 12 },
    recordButton: { backgroundColor: '#007C91' },
    stopButton: { backgroundColor: '#B42318' },
    disabledButton: { opacity: 0.45 },
    buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
    pendingPanel: { backgroundColor: '#E6F4FE', borderColor: '#007C91', borderRadius: 8, borderWidth: 2, marginTop: 16, padding: 14 },
    pendingTitle: { color: '#102A43', fontSize: 15, fontWeight: '800' },
    pendingPhrase: { color: '#102A43', fontSize: 19, lineHeight: 27, marginVertical: 8 },
    sampleRow: { backgroundColor: '#FFFFFF', borderColor: '#BCCCDC', borderRadius: 8, borderWidth: 1, marginTop: 12, padding: 12 },
    sampleInput: { borderBottomColor: '#829AB1', borderBottomWidth: 1, color: '#102A43', fontSize: 18, minHeight: 48, paddingHorizontal: 6 },
    sampleActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    actionButton: { alignItems: 'center', borderRadius: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
    playButton: { backgroundColor: '#486581' },
    saveButton: { backgroundColor: '#147D64' },
    deleteButton: { backgroundColor: '#B42318' },
    actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    status: { color: '#243B53', fontSize: 16, lineHeight: 23, marginTop: 14 },
    divider: { backgroundColor: '#BCCCDC', height: 1, marginTop: 24 },
    empty: { color: '#486581', fontSize: 17, marginTop: 8 },
    backButton: { backgroundColor: '#102A43', marginTop: 24 },
});