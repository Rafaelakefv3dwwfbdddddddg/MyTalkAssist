export type AICommunicationInput = {
    originalPhrase: string;
    recognizedText: string;
    speechConfidence?: number;
};

export type AICommunicationAnalysis = {
    correctedText: string;
    confidence: number;
    changedMeaning: boolean;
    needsConfirmation: boolean;
    explanation?: string;
};

function normalize(text: string) {
    return text
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(left: string, right: string) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row++) {
        const current = [row];
        for (let column = 1; column <= right.length; column++) {
            current[column] = Math.min(
                current[column - 1] + 1,
                previous[column] + 1,
                previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
            );
        }
        previous.splice(0, previous.length, ...current);
    }
    return previous[right.length];
}

function similarity(left: string, right: string) {
    if (!left && !right) return 1;
    return 1 - levenshtein(left, right) / Math.max(left.length, right.length);
}

function isNaturalVariation(original: string, recognized: string) {
    const originalWords = original.split(' ');
    const recognizedWords = recognized.split(' ');
    if (originalWords.length !== recognizedWords.length) return false;
    return originalWords.every((word, index) => {
        const other = recognizedWords[index];
        return word === other || (word === 'para' && other === 'pra') || (word === 'pra' && other === 'para');
    });
}

class AICommunicationService {
    analyze({ originalPhrase, recognizedText, speechConfidence = -1 }: AICommunicationInput): AICommunicationAnalysis {
        const original = normalize(originalPhrase);
        const recognized = normalize(recognizedText);
        const inputConfidence = speechConfidence >= 0 ? speechConfidence : similarity(original, recognized);

        if (!recognized) {
            return {
                correctedText: '',
                confidence: 0,
                changedMeaning: false,
                needsConfirmation: true,
                explanation: 'Nenhum texto reconhecido.',
            };
        }

        if (!original) {
            return {
                correctedText: recognizedText.trim(),
                confidence: inputConfidence,
                changedMeaning: false,
                needsConfirmation: inputConfidence < 0.7,
                explanation: 'Sem frase original para comparar; a mensagem foi preservada.',
            };
        }

        if (original === recognized || isNaturalVariation(original, recognized)) {
            return {
                correctedText: recognizedText.trim(),
                confidence: Math.max(inputConfidence, 0.95),
                changedMeaning: false,
                needsConfirmation: inputConfidence >= 0 && inputConfidence < 0.7,
                explanation: isNaturalVariation(original, recognized) ? 'Variação natural preservada.' : undefined,
            };
        }

        const closeEnough = levenshtein(original, recognized) <= 2 && inputConfidence >= 0.7;
        if (closeEnough) {
            return {
                correctedText: originalPhrase.trim(),
                confidence: Math.max(inputConfidence, 0.8),
                changedMeaning: false,
                needsConfirmation: false,
                explanation: 'Pequeno erro de reconhecimento corrigido localmente.',
            };
        }

        const meaningChanged = similarity(original, recognized) < 0.7;
        return {
            correctedText: recognizedText.trim(),
            confidence: inputConfidence,
            changedMeaning: meaningChanged,
            needsConfirmation: true,
            explanation: meaningChanged
                ? 'A mensagem reconhecida pode ter outro significado e não foi corrigida automaticamente.'
                : 'Há dúvida sobre a intenção; confirme o texto antes de falar.',
        };
    }
}

export default new AICommunicationService();
export { AICommunicationService };
