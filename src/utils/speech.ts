// Web Speech API wrapper for Text-to-Speech with voiceschanged event handling

export class SpeechService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static isInitialized = false;

  private static initVoices(): void {
    if (!this.synth || this.isInitialized) return;
    this.isInitialized = true;

    const populate = () => {
      try {
        if (this.synth) {
          const list = this.synth.getVoices();
          if (list && list.length > 0) {
            this.cachedVoices = list;
          }
        }
      } catch (e) {
        console.warn('Could not populate speech voices:', e);
      }
    };

    populate();
    // In many browsers, getVoices() is empty initially and loads asynchronously
    if (this.synth) {
      this.synth.onvoiceschanged = populate;
    }
  }

  public static getVoices(): SpeechSynthesisVoice[] {
    this.initVoices();
    if (this.cachedVoices.length === 0 && this.synth) {
      this.cachedVoices = this.synth.getVoices();
    }
    return this.cachedVoices;
  }

  public static speak(
    text: string, 
    onEnd?: () => void, 
    onError?: (err: any) => void
  ): boolean {
    if (!this.synth) {
      if (onError) onError('Speech synthesis not available in this browser');
      return false;
    }

    this.initVoices();

    // Cancel any active speech
    this.stop();

    // Clean text: strip code blocks, latex delimiters, markdown markers for natural listening
    const clean = text
      .replace(/\[SUGERENCIAS\]:[\s\S]*$/gi, '')
      .replace(/```[\s\S]*?```/g, 'Fórmula detallada en pantalla.')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[_*{}[\]#$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return false;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES'; // Spanish
    utterance.rate = 1.0;
    utterance.pitch = 1.05; // Friendly warm pitch for Newton mascot

    // Try finding a pleasant Spanish voice (ES, MX, US, PE)
    const voices = this.getVoices();
    const spanishVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('es') && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Monica') || v.name.includes('Paulina') || v.name.includes('Jorge') || v.name.includes('Helena'))
    ) || voices.find(v => v.lang.toLowerCase().startsWith('es'));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return !!(this.synth && (this.synth.speaking || this.synth.pending));
  }
}
