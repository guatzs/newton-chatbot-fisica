import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Send, Sparkles, RefreshCw, AlertCircle, Square, Loader2 } from 'lucide-react';
import { NewtonMascot } from './NewtonMascot';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVoicePrompt: (prompt: string) => void;
}

const MAX_RECORDING_SECONDS = 60;

/**
 * Convierte la grabación (webm, mp4, ogg...) a WAV mono de 16 kHz, un formato que Gemini
 * acepta siempre. Si el navegador no puede decodificarla, devuelve el audio original.
 */
async function convertToWav(blob: Blob): Promise<{ blob: Blob; mimeType: string }> {
  try {
    const AudioCtx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx || typeof OfflineAudioContext === 'undefined') {
      return { blob, mimeType: blob.type || 'audio/webm' };
    }
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioCtx();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(arrayBuffer);
    } finally {
      ctx.close().catch(() => {});
    }

    const targetRate = 16000;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, length, targetRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeText = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return { blob: new Blob([buffer], { type: 'audio/wav' }), mimeType: 'audio/wav' };
  } catch (err) {
    console.warn('No se pudo convertir el audio a WAV; se enviará el original:', err);
    return { blob, mimeType: blob.type || 'audio/webm' };
  }
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitVoicePrompt,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoStopNotice, setAutoStopNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAudioRef = useRef<{ blob: Blob; mimeType: string } | null>(null);
  const abortOnCloseRef = useRef<boolean>(false);

  const stopAudioTracks = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  // Clean state when modal opens or closes — DO NOT start recording automatically
  useEffect(() => {
    if (!isOpen) {
      abortOnCloseRef.current = true;
      stopRecordingCleanup();
      setTranscript('');
      setPermissionDenied(false);
      setErrorMessage(null);
      setAutoStopNotice(null);
      setIsTranscribing(false);
      setRecordingSeconds(0);
      lastAudioRef.current = null;
    } else {
      abortOnCloseRef.current = false;
    }
    return () => {
      abortOnCloseRef.current = true;
      stopRecordingCleanup();
    };
  }, [isOpen]);

  // Timer effect for recording duration and 60s automatic cutoff
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => Math.min(prev + 1, MAX_RECORDING_SECONDS));
      }, 1000);

      autoStopTimerRef.current = setTimeout(() => {
        setAutoStopNotice(
          'Se alcanzó el límite máximo de 60 segundos. La grabación se detuvo automáticamente.'
        );
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            stopAudioTracks();
          }
        } else {
          stopAudioTracks();
        }
        setIsRecording(false);
      }, MAX_RECORDING_SECONDS * 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    };
  }, [isRecording]);

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopAudioTracks();
    setIsRecording(false);
  };

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const handleStartRecording = async () => {
    setPermissionDenied(false);
    setErrorMessage(null);
    setAutoStopNotice(null);
    audioChunksRef.current = [];
    abortOnCloseRef.current = false;

    if (!window.isSecureContext) {
      setErrorMessage(
        'La grabación de audio requiere una conexión segura (HTTPS o localhost). Verifica la dirección o escribe tu consulta directamente.'
      );
      return;
    }

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMessage(
        'Tu navegador no permite capturar audio desde este dispositivo. Usa Chrome, Safari o Edge actualizado, o escribe tu consulta.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawMime = mimeType || mediaRecorder.mimeType || 'audio/webm';
        const cleanMime = rawMime.split(';')[0].trim() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });

        // Stop audio tracks immediately after recording finishes
        stopAudioTracks();

        if (abortOnCloseRef.current) {
          return;
        }

        if (audioBlob.size > 0) {
          const converted = await convertToWav(audioBlob);
          if (abortOnCloseRef.current) return;
          lastAudioRef.current = { blob: converted.blob, mimeType: converted.mimeType };
          await processAudioWithGemini(converted.blob, converted.mimeType);
        } else {
          setErrorMessage('No se capturó audio. Verifica que tu micrófono funcione e intenta de nuevo.');
        }
      };

      mediaRecorder.onerror = () => {
        stopAudioTracks();
        setIsRecording(false);
        setErrorMessage('Ocurrió un error al grabar el audio. Intenta de nuevo.');
      };

      mediaRecorder.start(250); // Record in 250ms chunks
      setIsRecording(true);
    } catch (err: any) {
      console.warn('Microphone access error:', err);
      stopAudioTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage(
          'Permiso de micrófono denegado. Activa el micrófono en los permisos de tu navegador (ícono de candado junto a la URL) e intenta de nuevo. Si estás dentro de Google AI Studio, abre la app en una pestaña nueva.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ningún micrófono conectado en tu dispositivo.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('El micrófono está ocupado por otra aplicación. Ciérrala e intenta de nuevo.');
      } else {
        setErrorMessage(`No se pudo iniciar la grabación: ${err.message || 'error desconocido'}`);
      }
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      stopAudioTracks();
    }
    setIsRecording(false);
  };

  const processAudioWithGemini = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    try {
      // Convert audio blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Send to server Gemini transcription endpoint
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: cleanMimeType,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Error ${response.status} en la transcripción`);
      }

      const data = await response.json();
      if (data.text) {
        setTranscript(data.text);
      } else {
        setErrorMessage('No se detectó voz clara en el audio. Intenta grabar de nuevo con mayor claridad.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      const msg =
        err?.name === 'TimeoutError'
          ? 'La transcripción tardó demasiado. Intenta de nuevo o graba un audio más corto.'
          : err?.message || 'revisa tu conexión e intenta de nuevo';
      setErrorMessage(`Error al transcribir: ${msg}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetryAction = () => {
    if (lastAudioRef.current && !permissionDenied) {
      processAudioWithGemini(lastAudioRef.current.blob, lastAudioRef.current.mimeType);
    } else {
      handleStartRecording();
    }
  };

  const handleSubmit = () => {
    if (!transcript.trim()) return;
    onSubmitVoicePrompt(transcript.trim());
    onClose();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-6 border-2 border-[#FA8989] dark:border-[#8A3A4A] shadow-2xl overflow-hidden flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 hover:bg-[#D6E3B1] dark:hover:bg-[#24402B] flex items-center justify-center text-[#546C37] dark:text-[#CFE3A8] transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mascot */}
        <div className="mb-2">
          <NewtonMascot
            size={76}
            mood={isRecording ? 'talking' : isTranscribing ? 'thinking' : 'happy'}
            animated
          />
        </div>

        <h3 className="text-xl font-bold text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] tracking-wide">
          Entrada de Voz con Newton
        </h3>
        <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] mt-1 max-w-sm">
          Graba tu ejercicio o duda técnica. Gemini transcribirá tu voz en español para que puedas revisarla y editarla.
        </p>

        {/* Auto-stop 60s notice */}
        {autoStopNotice && !errorMessage && (
          <div className="w-full mt-3 p-2.5 bg-[#FFFBD9] dark:bg-[#16241A] border border-[#ADCA88] dark:border-[#3C5A40] rounded-2xl flex items-start gap-2 text-left text-xs text-[#546C37] dark:text-[#CFE3A8]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#941C2F] dark:text-[#FF9FAE]" />
            <span>{autoStopNotice}</span>
          </div>
        )}

        {/* Error banner (e.g. mic permission denied or transcription failed) */}
        {errorMessage && (
          <div className="w-full mt-3 p-3 bg-[#FDC2B1]/60 dark:bg-[#4A2530]/60 border border-[#FA8989] dark:border-[#8A3A4A] rounded-2xl flex items-start justify-between gap-2.5 text-left text-xs text-[#941C2F] dark:text-[#FF9FAE]">
            <div className="flex items-start gap-2 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#941C2F] dark:text-[#FF9FAE]" />
              <div className="flex-1">
                <span className="font-bold">
                  {permissionDenied ? 'Permiso Requerido: ' : 'Aviso: '}
                </span>
                {errorMessage}
              </div>
            </div>
            {!isRecording && !isTranscribing && (
              <button
                type="button"
                onClick={handleRetryAction}
                className="shrink-0 py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reintentar</span>
              </button>
            )}
          </div>
        )}

        {/* Central Audio Control */}
        <div className="my-5 relative flex flex-col items-center justify-center">
          {isRecording && (
            <>
              <div className="absolute w-24 h-24 rounded-full bg-[#FA8989]/30 animate-ping"></div>
              <div className="absolute w-20 h-20 rounded-full bg-[#FA8989]/50 animate-pulse"></div>
            </>
          )}

          <button
            onClick={() => {
              if (isRecording) {
                handleStopRecording();
              } else {
                handleStartRecording();
              }
            }}
            disabled={isTranscribing}
            className={`w-18 h-18 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform active:scale-95 z-10 cursor-pointer ${
              isRecording
                ? 'bg-[#941C2F] dark:bg-[#C0334A] ring-4 ring-[#FA8989] dark:ring-[#8A3A4A]'
                : isTranscribing
                ? 'bg-[#ADCA88] dark:bg-[#3C5A40] cursor-not-allowed'
                : 'bg-[#FA8989] hover:bg-[#941C2F] dark:hover:bg-[#C0334A]'
            }`}
            title={isRecording ? 'Detener grabación' : 'Comenzar a grabar'}
          >
            {isTranscribing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <Square className="w-7 h-7 fill-white" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          {/* Recording Status & Timer */}
          <div className="mt-3">
            {isRecording ? (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#941C2F] dark:text-[#FF9FAE]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-pulse"></span>
                <span>Grabando… {formatSeconds(recordingSeconds)} / 1:00 (clic para parar)</span>
              </div>
            ) : isTranscribing ? (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#546C37] dark:text-[#CFE3A8]">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#941C2F] dark:text-[#FF9FAE]" />
                <span>Transcribiendo…</span>
              </div>
            ) : (
              <span className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-medium">
                {transcript
                  ? 'Audio transcrito. Puedes editar el texto abajo o regrabar.'
                  : 'Presiona el botón rojo para comenzar a hablar.'}
              </span>
            )}
          </div>
        </div>

        {/* Editable Transcript Textarea */}
        <div className="w-full text-left mb-4">
          <label className="block text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] mb-1.5 flex items-center justify-between">
            <span>Revisa o edita tu transcripción:</span>
            {transcript && (
              <span className="text-[10px] text-[#546C37]/60 dark:text-[#CFE3A8]/60 font-mono">
                {transcript.length} caracteres
              </span>
            )}
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={isRecording || isTranscribing}
            rows={4}
            placeholder={
              isRecording
                ? 'Escuchando tu voz...'
                : isTranscribing
                ? 'Gemini está transcribiendo tu audio...'
                : 'La transcripción de tu voz aparecerá aquí para que la edites o corrijas antes de enviarla a Newton.'
            }
            className="w-full bg-white dark:bg-[#16241A] rounded-2xl p-3 border-2 border-[#ADCA88] dark:border-[#3C5A40] focus:border-[#FA8989] dark:focus:border-[#8A3A4A] focus:outline-none text-xs text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] resize-none shadow-inner disabled:bg-gray-50/70 dark:disabled:bg-[#16241A]/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2">
          {transcript && (
            <button
              type="button"
              onClick={() => setTranscript('')}
              disabled={isRecording || isTranscribing}
              className="py-2.5 px-3 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              Borrar
            </button>
          )}

          {transcript && !isRecording && !isTranscribing && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="py-2.5 px-3 bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#FA8989] dark:border-[#8A3A4A] hover:bg-[#FDC2B1]/40 dark:hover:bg-[#4A2530]/40 text-[#941C2F] dark:text-[#FF9FAE] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Regrabar</span>
            </button>
          )}

          <button
            type="button"
            disabled={!transcript.trim() || isRecording || isTranscribing}
            onClick={handleSubmit}
            className="flex-1 py-2.5 px-4 bg-[#941C2F] dark:bg-[#C0334A] disabled:opacity-40 hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <span>Enviar al Chat de Newton</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
