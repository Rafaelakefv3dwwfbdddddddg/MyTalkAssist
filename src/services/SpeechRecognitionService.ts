import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
  type ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

export type RecognitionResult = {
  text: string;
  confidence: number;
  isFinal: boolean;
};

export type RecognitionError = {
  code: string;
  message: string;
};

class SpeechRecognitionService {
  private resultSubscription?: { remove: () => void };
  private errorSubscription?: { remove: () => void };
  private endSubscription?: { remove: () => void };
  private resultHandler?: (result: RecognitionResult) => void;
  private errorHandler?: (error: RecognitionError) => void;
  private endHandler?: () => void;

  requestPermission() {
    return ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }

  isAvailable() {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  }

  startListening(
    onResult: (result: RecognitionResult) => void,
    onError: (error: RecognitionError) => void,
    onEnd?: () => void,
  ) {
    this.cleanupListeners();
    this.resultHandler = onResult;
    this.errorHandler = onError;
    this.endHandler = onEnd;
    this.resultSubscription = ExpoSpeechRecognitionModule.addListener('result', this.onResult);
    this.errorSubscription = ExpoSpeechRecognitionModule.addListener('error', this.onError);
    this.endSubscription = ExpoSpeechRecognitionModule.addListener('end', this.onEnd);
    ExpoSpeechRecognitionModule.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
    });
  }

  stopListening() {
    ExpoSpeechRecognitionModule.stop();
  }

  cancelListening() {
    ExpoSpeechRecognitionModule.abort();
    this.cleanupListeners();
  }

  private onResult = (event: ExpoSpeechRecognitionResultEvent) => {
    const result = event.results[0];
    if (result) {
      this.resultHandler?.({ text: result.transcript, confidence: result.confidence, isFinal: event.isFinal });
      if (event.isFinal) {
        this.cleanupListeners();
      }
    }
  };

  private onError = (event: ExpoSpeechRecognitionErrorEvent) => {
    if (event.error !== 'aborted') {
      this.errorHandler?.({ code: event.error, message: event.message });
    }
    this.cleanupListeners();
  };

  private onEnd = () => {
    this.endHandler?.();
    this.cleanupListeners();
  };

  private cleanupListeners() {
    this.resultSubscription?.remove();
    this.errorSubscription?.remove();
    this.endSubscription?.remove();
    this.resultSubscription = undefined;
    this.errorSubscription = undefined;
    this.endSubscription = undefined;
    this.resultHandler = undefined;
    this.errorHandler = undefined;
    this.endHandler = undefined;
  }
}

export default new SpeechRecognitionService();