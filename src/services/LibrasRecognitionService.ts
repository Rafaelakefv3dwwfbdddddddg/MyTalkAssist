export type LibrasRgbFrame = Readonly<{
    timestampMs: number;
    width: number;
    height: number;
    rgb: Uint8Array;
}>;

export type LibrasModelMetadata = Readonly<{
    id: string;
    scope: 'isolated-sign';
    modelLicense: string;
    datasetLicense: string;
    datasetAttribution: string;
    commercialUse: 'permitted' | 'not-permitted' | 'unknown';
}>;

export type LocalLibrasModel = Readonly<{
    metadata: LibrasModelMetadata;
    input: Readonly<{
        frameCount: number;
        width: number;
        height: number;
        colorOrder: 'RGB';
        layout: 'CTHW';
        dtype: 'uint8';
    }>;
    classes: readonly string[];
    minimumConfidence: number;
    predict: (frames: readonly LibrasRgbFrame[]) => Promise<{
        label: string;
        confidence: number;
    } | null>;
}>;

export type LibrasRecognitionResult =
    | {
        status: 'unavailable';
        reason: 'model-not-integrated' | 'model-not-authorized';
        message: string;
    }
    | {
        status: 'unrecognized';
        scope: 'isolated-sign';
        message: string;
    }
    | {
        status: 'experimental-candidate';
        scope: 'isolated-sign';
        label: string;
        confidence: number;
        message: string;
    };

class LibrasRecognitionService {
    constructor(private readonly model: LocalLibrasModel | null = null) { }

    async recognize(frames: readonly LibrasRgbFrame[] = []): Promise<LibrasRecognitionResult> {
        if (!this.model) {
            return {
                status: 'unavailable',
                reason: 'model-not-integrated',
                message: 'Reconhecimento de sinais indisponível: ainda não há um modelo local integrado. Nenhum sinal foi traduzido.',
            };
        }

        if (this.model.metadata.commercialUse !== 'permitted') {
            return {
                status: 'unavailable',
                reason: 'model-not-authorized',
                message: 'Reconhecimento indisponível: as permissões do modelo ou dos dados não autorizam claramente o uso comercial.',
            };
        }

        if (frames.length === 0) {
            return {
                status: 'unrecognized',
                scope: 'isolated-sign',
                message: 'Nenhuma sequência local de frames foi recebida. Nenhum sinal foi reconhecido.',
            };
        }

        try {
            const prediction = await this.model.predict(frames);
            if (
                !prediction
                || !this.model.classes.includes(prediction.label)
                || !Number.isFinite(prediction.confidence)
                || prediction.confidence < this.model.minimumConfidence
                || prediction.confidence > 1
            ) {
                return {
                    status: 'unrecognized',
                    scope: 'isolated-sign',
                    message: 'Não reconheci o sinal com confiança suficiente. Nenhuma palavra foi sugerida.',
                };
            }

            return {
                status: 'experimental-candidate',
                scope: 'isolated-sign',
                label: prediction.label,
                confidence: prediction.confidence,
                message: `Candidato experimental para sinal isolado: ${prediction.label}. Revise antes de confirmar; isso não reconhece frases completas.`,
            };
        } catch {
            return {
                status: 'unrecognized',
                scope: 'isolated-sign',
                message: 'A análise local falhou. Nenhum sinal foi reconhecido.',
            };
        }
    }
}

export default new LibrasRecognitionService();
export { LibrasRecognitionService };