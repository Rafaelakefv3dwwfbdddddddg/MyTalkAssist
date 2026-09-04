export type SpeechAnalysis = {
  suggestedText: string;
  isEquivalent: boolean;
  confidence: number;
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
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column++) rows[0][column] = column;
  for (let row = 1; row <= left.length; row++) {
    for (let column = 1; column <= right.length; column++) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  return rows[left.length][right.length];
}

class SpeechAnalysisService {
  compare(phrase: string, recognizedText: string, sttConfidence = -1): SpeechAnalysis {
    const original = normalize(phrase);
    const recognized = normalize(recognizedText);
    const distance = levenshtein(original, recognized);
    const close = Boolean(recognized) && (original === recognized || distance <= 2);
    return {
      suggestedText: close ? phrase : recognizedText,
      isEquivalent: close,
      confidence: sttConfidence,
    };
  }
}

export default new SpeechAnalysisService();