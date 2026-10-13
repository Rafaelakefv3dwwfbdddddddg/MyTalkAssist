import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

const STORAGE_KEY = 'talkassist.personal-voice.samples.v1';
export const MAX_PERSONAL_VOICE_SAMPLES = 12;
export const MAX_PERSONAL_VOICE_PHRASE_LENGTH = 120;

export type PersonalVoiceSample = {
    id: string;
    phrase: string;
    audioUri: string;
    createdAt: number;
};

function isSample(value: unknown): value is PersonalVoiceSample {
    if (!value || typeof value !== 'object') return false;
    const sample = value as Partial<PersonalVoiceSample>;
    return typeof sample.id === 'string'
        && typeof sample.phrase === 'string'
        && typeof sample.audioUri === 'string'
        && typeof sample.createdAt === 'number';
}

async function persistSamples(samples: PersonalVoiceSample[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
}

async function toPersistentWebUri(uri: string) {
    const blob = await (await fetch(uri)).blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível preparar o áudio.'));
        reader.onerror = () => reject(reader.error ?? new Error('Não foi possível preparar o áudio.'));
        reader.readAsDataURL(blob);
    });
}

export async function getPersonalVoiceSamples(): Promise<PersonalVoiceSample[]> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
        const parsed: unknown = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(isSample) : [];
    } catch {
        return [];
    }
}

export async function savePersonalVoiceSample(phrase: string, recordingUri: string) {
    const samples = await getPersonalVoiceSamples();
    const normalizedPhrase = phrase.trim();
    if (!normalizedPhrase || normalizedPhrase.length > MAX_PERSONAL_VOICE_PHRASE_LENGTH) {
        throw new Error(`A frase deve ter entre 1 e ${MAX_PERSONAL_VOICE_PHRASE_LENGTH} caracteres.`);
    }
    if (samples.length >= MAX_PERSONAL_VOICE_SAMPLES) {
        throw new Error(`O limite de ${MAX_PERSONAL_VOICE_SAMPLES} gravações foi atingido.`);
    }

    const audioUri = Platform.OS === 'web' ? await toPersistentWebUri(recordingUri) : recordingUri;
    const sample: PersonalVoiceSample = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        phrase: normalizedPhrase,
        audioUri,
        createdAt: Date.now(),
    };

    try {
        await persistSamples([sample, ...samples]);
    } catch (error) {
        if (Platform.OS !== 'web') {
            try {
                const file = new File(recordingUri);
                if (file.exists) file.delete();
            } catch {
                // The metadata write error is the useful failure to report.
            }
        }
        throw error;
    }

    return [sample, ...samples];
}

export async function updatePersonalVoicePhrase(id: string, phrase: string) {
    const normalizedPhrase = phrase.trim();
    if (!normalizedPhrase || normalizedPhrase.length > MAX_PERSONAL_VOICE_PHRASE_LENGTH) {
        throw new Error(`A frase deve ter entre 1 e ${MAX_PERSONAL_VOICE_PHRASE_LENGTH} caracteres.`);
    }
    const samples = await getPersonalVoiceSamples();
    const updated = samples.map((sample) => sample.id === id ? { ...sample, phrase: normalizedPhrase } : sample);
    await persistSamples(updated);
    return updated;
}

export async function deletePersonalVoiceSample(id: string) {
    const samples = await getPersonalVoiceSamples();
    const sample = samples.find((item) => item.id === id);
    const remaining = samples.filter((item) => item.id !== id);

    if (sample && Platform.OS !== 'web') {
        const file = new File(sample.audioUri);
        if (file.exists) file.delete();
    }

    await persistSamples(remaining);
    return remaining;
}

export function getContextualPhrases(samples: PersonalVoiceSample[]) {
    const unique = new Map<string, string>();
    for (const sample of samples) {
        const phrase = sample.phrase.trim();
        const key = phrase.toLocaleLowerCase('pt-BR');
        if (phrase && !unique.has(key)) unique.set(key, phrase);
    }
    return [...unique.values()].slice(0, 100);
}

export async function loadContextualPhrases() {
    return getContextualPhrases(await getPersonalVoiceSamples());
}