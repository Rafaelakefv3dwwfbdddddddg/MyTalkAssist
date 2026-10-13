import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
  type ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

type DesktopSpeechBridge = {
  isAvailable: () => Promise<boolean>;
  requestPermission: () => Promise<{ granted: boolean }>;
  start: (contextualPhrases?: string[]) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  onResult: (handler: (result: RecognitionResult) => void) => () => void;
  onError: (handler: (error: RecognitionError) => void) => () => void;
  onEnd: (handler: () => void) => () => void;
};

declare global {
  interface Window {
    talkAssistDesktop?: {
      speech: DesktopSpeechBridge;
      tts: {
        speak: (text: string, rate: number, pitch: number) => Promise<void>;
        stop: () => Promise<void>;
      };
    };
  }
}

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
  private desktopCleanup?: () => void;
  private resultSubscription?: { remove: () => void };
  private errorSubscription?: { remove: () => void };
  private endSubscription?: { remove: () => void };
  private resultHandler?: (result: RecognitionResult) => void;
  private errorHandler?: (error: RecognitionError) => void;
  private endHandler?: () => void;

  requestPermission() {
    if (typeof window !== 'undefined' && window.talkAssistDesktop) {
      return window.talkAssistDesktop.speech.requestPermission();
    }
    return ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }

  isAvailable() {
    if (typeof window !== 'undefined' && window.talkAssistDesktop) {
      return window.talkAssistDesktop.speech.isAvailable();
    }
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  }

  startListening(
    onResult: (result: RecognitionResult) => void,
    onError: (error: RecognitionError) => void,
    onEnd?: () => void,
    contextualPhrases: string[] = [],
  ) {
    this.cleanupListeners();
    this.resultHandler = onResult;
    this.errorHandler = onError;
    this.endHandler = onEnd;
    const desktopSpeech = typeof window !== 'undefined' ? window.talkAssistDesktop?.speech : undefined;
    if (desktopSpeech) {
      const removeResult = desktopSpeech.onResult(this.onDesktopResult);
      const removeError = desktopSpeech.onError(this.onDesktopError);
      const removeEnd = desktopSpeech.onEnd(this.onEnd);
      this.desktopCleanup = () => {
        removeResult();
        removeError();
        removeEnd();
      };
      void desktopSpeech.start(contextualPhrases);
      return;
    }
    this.resultSubscription = ExpoSpeechRecognitionModule.addListener('result', this.onResult);
    this.errorSubscription = ExpoSpeechRecognitionModule.addListener('error', this.onError);
    this.endSubscription = ExpoSpeechRecognitionModule.addListener('end', this.onEnd);
    ExpoSpeechRecognitionModule.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      contextualStrings: Platform.OS === 'web' ? undefined : contextualPhrases,
    });
  }

  stopListening() {
    if (typeof window !== 'undefined' && window.talkAssistDesktop) {
      void window.talkAssistDesktop.speech.stop();
      return;
    }
    ExpoSpeechRecognitionModule.stop();
  }

  cancelListening() {
    if (typeof window !== 'undefined' && window.talkAssistDesktop) {
      void window.talkAssistDesktop.speech.cancel();
      this.cleanupListeners();
      return;
    }
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

  private onDesktopResult = (result: RecognitionResult) => {
    this.resultHandler?.(result);
    if (result.isFinal) this.cleanupListeners();
  };

  private onDesktopError = (error: RecognitionError) => {
    this.errorHandler?.(error);
    this.cleanupListeners();
  };

  private onEnd = () => {
    this.endHandler?.();
    this.cleanupListeners();
  };

  private cleanupListeners() {
    this.desktopCleanup?.();
    this.desktopCleanup = undefined;
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