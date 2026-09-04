import * as Speech from 'expo-speech';

class TextToSpeechService {
  private wasStopped = false;

  async speak(text: string, rate = 0.9, pitch = 1) {
    this.wasStopped = false;
    const voices = await Speech.getAvailableVoicesAsync();
    const brazilianVoice = voices.find((voice) => voice.language.toLowerCase() === 'pt-br')
      ?? voices.find((voice) => voice.language.toLowerCase().startsWith('pt-'));

    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: 'pt-BR',
        ...(brazilianVoice ? { voice: brazilianVoice.identifier } : {}),
        rate,
        pitch,
        onDone: resolve,
        onStopped: resolve,
        onError: (error) => this.wasStopped ? resolve() : reject(error),
      });
    });
  }

  stop() {
    this.wasStopped = true;
    return Speech.stop();
  }
}

export default new TextToSpeechService();