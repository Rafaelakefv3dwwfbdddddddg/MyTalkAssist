import AICommunicationService from './AICommunicationService';

function assertEqual<T>(actual: T, expected: T) {
    if (actual !== expected) {
        throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
    }
}

const closeCorrection = AICommunicationService.analyze({
    originalPhrase: 'Eu quero beber água.',
    recognizedText: 'Eu quero bebe agua',
});
assertEqual(closeCorrection.correctedText, 'Eu quero beber água.');
assertEqual(closeCorrection.changedMeaning, false);
assertEqual(closeCorrection.needsConfirmation, false);

const naturalVariation = AICommunicationService.analyze({
    originalPhrase: 'Eu quero ir para casa.',
    recognizedText: 'Eu quero ir pra casa',
});
assertEqual(naturalVariation.correctedText, 'Eu quero ir pra casa');
assertEqual(naturalVariation.changedMeaning, false);

const differentPhrase = AICommunicationService.analyze({
    originalPhrase: 'Eu quero beber água.',
    recognizedText: 'Eu quero comer.',
});
assertEqual(differentPhrase.correctedText, 'Eu quero comer.');
assertEqual(differentPhrase.changedMeaning, true);
assertEqual(differentPhrase.needsConfirmation, true);

const emptyText = AICommunicationService.analyze({
    originalPhrase: 'Eu quero beber água.',
    recognizedText: '',
});
assertEqual(emptyText.correctedText, '');
assertEqual(emptyText.needsConfirmation, true);

const lowConfidence = AICommunicationService.analyze({
    originalPhrase: 'Eu quero beber água.',
    recognizedText: 'Eu quero beber água.',
    speechConfidence: 0.4,
});
assertEqual(lowConfidence.needsConfirmation, true);

const meaningChange = AICommunicationService.analyze({
    originalPhrase: 'Eu quero beber água.',
    recognizedText: 'Eu quero comer.',
    speechConfidence: 0.95,
});
assertEqual(meaningChange.correctedText, 'Eu quero comer.');
assertEqual(meaningChange.changedMeaning, true);
assertEqual(meaningChange.needsConfirmation, true);

console.log('AICommunicationService tests passed');
