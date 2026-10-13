export type LibrasTranslationResult = {
    status: 'unavailable';
    reason: 'validated-signs-not-available';
    message: string;
};

class LibrasTranslationService {
    translate(_text: string): LibrasTranslationResult {
        return {
            status: 'unavailable',
            reason: 'validated-signs-not-available',
            message: 'Esta mensagem ainda não pode ser representada em Libras: não há vídeos de sinais ou tradução validada disponíveis.',
        };
    }
}

export default new LibrasTranslationService();
export { LibrasTranslationService };