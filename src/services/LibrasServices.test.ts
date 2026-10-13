import LibrasRecognitionService from './LibrasRecognitionService';
import { LibrasRecognitionService as RecognitionService, type LocalLibrasModel } from './LibrasRecognitionService';
import LibrasTranslationService from './LibrasTranslationService';

function assertEqual<T>(actual: T, expected: T) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

async function runTests() {
    const recognition = await LibrasRecognitionService.recognize();
    assertEqual(recognition.status, 'unavailable');
    if (recognition.status === 'unavailable') {
        assertEqual(recognition.reason, 'model-not-integrated');
        if (!recognition.message.includes('Nenhum sinal foi traduzido')) {
            throw new Error('Recognition must clearly report that no sign was translated.');
        }
    }

    const unauthorizedModel: LocalLibrasModel = {
        metadata: {
            id: 'test-model',
            scope: 'isolated-sign',
            modelLicense: 'MIT',
            datasetLicense: 'unknown',
            datasetAttribution: 'test source',
            commercialUse: 'unknown',
        },
        input: {
            frameCount: 32,
            width: 224,
            height: 224,
            colorOrder: 'RGB',
            layout: 'CTHW',
            dtype: 'uint8',
        },
        classes: ['ÁGUA'],
        minimumConfidence: 0.8,
        predict: async () => ({ label: 'ÁGUA', confidence: 0.99 }),
    };
    const frame = { timestampMs: 0, width: 224, height: 224, rgb: new Uint8Array(224 * 224 * 3) };
    const unauthorizedResult = await new RecognitionService(unauthorizedModel).recognize([frame]);
    assertEqual(unauthorizedResult.status, 'unavailable');
    if (unauthorizedResult.status === 'unavailable') assertEqual(unauthorizedResult.reason, 'model-not-authorized');

    const authorizedModel: LocalLibrasModel = {
        ...unauthorizedModel,
        metadata: { ...unauthorizedModel.metadata, datasetLicense: 'CC-BY-4.0', commercialUse: 'permitted' },
    };
    const candidateResult = await new RecognitionService(authorizedModel).recognize([frame]);
    assertEqual(candidateResult.status, 'experimental-candidate');
    if (candidateResult.status === 'experimental-candidate') {
        assertEqual(candidateResult.scope, 'isolated-sign');
        assertEqual(candidateResult.label, 'ÁGUA');
    }

    const translation = LibrasTranslationService.translate('Bom dia.');
    assertEqual(translation.status, 'unavailable');
    assertEqual(translation.reason, 'validated-signs-not-available');
    if (!translation.message.includes('não há vídeos de sinais')) {
        throw new Error('Translation must clearly report that validated signs are unavailable.');
    }

    console.log('Libras services tests passed');
}

void runTests();