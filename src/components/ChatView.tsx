import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { NewtonMascot } from './NewtonMascot';
import { ChatMessage, ChatSession, CourseModuleId } from '../types';
import { SpeechService } from '../utils/speech';
import { 
  Send, 
  Camera, 
  Mic, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles, 
  Trash2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  History, 
  MessageSquare,
  Square,
  X
} from 'lucide-react';

const DIAGRAM_LOAD_TIMEOUT_MS = 60000;
const DIAGRAMS_ENABLED = false;

function withNewSeed(url: string): string {
  const seed = Math.floor(Math.random() * 1000000);
  if (/[?&]seed=\d+/.test(url)) return url.replace(/([?&]seed=)\d+/, `$1${seed}`);
  return `${url}${url.includes('?') ? '&' : '?'}seed=${seed}`;
}

function DiagramImage({ url, onRetry }: { url: string; onRetry?: () => void }) {
  const [src, setSrc] = useState(url);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [autoRetried, setAutoRetried] = useState(false);

  useEffect(() => {
    setSrc(url);
    setStatus('loading');
    setAutoRetried(false);
  }, [url]);

  const handleFail = useCallback(() => {
    if (!autoRetried && /^https?:\/\//i.test(url)) {
      setAutoRetried(true);
      setSrc(withNewSeed(url));
      setStatus('loading');
    } else {
      setStatus('error');
    }
  }, [autoRetried, url]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = window.setTimeout(handleFail, DIAGRAM_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, src, handleFail]);

  if (status === 'error') {
    return (
      <div className="w-full p-3 flex items-start justify-between gap-2.5 text-xs text-[#941C2F] dark:text-[#FF9FAE]">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-[11px] font-['Space_Grotesk'] text-[#3D121A]/85 dark:text-[#FBE9E4]/85">
            La imagen del diagrama no cargó: el servicio de imágenes no respondió o tardó demasiado.
          </span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[120px] flex items-center justify-center">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] font-mono text-[#546C37] dark:text-[#CFE3A8]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Cargando diagrama...</span>
        </div>
      )}
      <img
        key={src}
        src={src}
        alt="Diagrama físico generado por Newton AI"
        onLoad={() => setStatus('loaded')}
        onError={handleFail}
        className={`w-full h-auto max-h-[400px] object-contain rounded-xl transition-opacity ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

interface ChatViewProps {
  messages: ChatMessage[];
  sessions?: ChatSession[];
  currentSessionId?: string;
  onSendMessage: (text: string, imageBase64?: string) => Promise<void>;
  onStopGeneration?: () => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  isLoading: boolean;
  loadingMessages?: boolean;
  activeTopic?: string;
  activeModuleId?: CourseModuleId;
  onNewSession: () => void;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onRetryDiagram?: (messageId: string, diagramPrompt: string) => Promise<void>;
  hasGuestBanner?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  sessions = [],
  currentSessionId = '',
  onSendMessage,
  onStopGeneration,
  onOpenScanner,
  onOpenVoice,
  isLoading,
  loadingMessages = false,
  activeTopic = 'Tutoría de Física Aplicada',
  activeModuleId = 'electrostatica',
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRetryDiagram,
  hasGuestBanner = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Usa scroll 'auto' mientras llega texto en streaming para evitar saltos o bloqueos
    messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isLoading || loadingMessages) return;
    const text = inputText.trim() || 'Analiza esta imagen adjunta.';
    const imageToSend = attachedImage || undefined;
    setInputText('');
    setAttachedImage(null);
    await onSendMessage(text, imageToSend);
  };

  const handleSendChip = async (promptText: string) => {
    if (isLoading || loadingMessages) return;
    const imageToSend = attachedImage || undefined;
    setAttachedImage(null);
    await onSendMessage(promptText, imageToSend);
  };

  const handleInputPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(file);
          let { width, height } = bitmap;
          const maxDim = 1280;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.max(1, Math.round((height * maxDim) / width));
              width = maxDim;
            } else {
              width = Math.max(1, Math.round((width * maxDim) / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0, width, height);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.75)
            );
            if (blob) {
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              setAttachedImage(dataUrl);
            }
          }
        } catch {
          // Ignore paste decode errors
        } finally {
          bitmap?.close();
        }
        break;
      }
    }
  };

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      SpeechService.stop();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(msgId);
      SpeechService.speak(
        text,
        () => setSpeakingMessageId(null),
        () => setSpeakingMessageId(null)
      );
    }
  };

  const handleConfirmDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteSession) {
      await onDeleteSession(sessionId);
    }
    setSessionPendingDelete(null);
  };

  // Render the session list component for sidebar or mobile drawer
  const renderSessionList = () => (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] font-mono uppercase">
          <History className="w-3.5 h-3.5 text-[#941C2F] dark:text-[#FF9FAE]" />
          <span>Historial ({sessions.length})</span>
        </div>
        <button
          onClick={() => {
            onNewSession();
            setIsMobileHistoryOpen(false);
          }}
          className="p-1 px-2 bg-[#FA8989] hover:bg-[#FA8989]/90 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Nueva</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {sessions.length === 0 ? (
          <div className="text-center py-6 px-2 text-xs text-[#546C37]/60 dark:text-[#CFE3A8]/60">
            No hay conversaciones previas guardadas.
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === currentSessionId;
            const isPending = sessionPendingDelete === s.id;

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (onSelectSession && !isPending) {
                    onSelectSession(s.id);
                    setIsMobileHistoryOpen(false);
                  }
                }}
                className={`relative rounded-2xl p-2.5 transition-all text-left group cursor-pointer border ${
                  isActive
                    ? 'bg-[#D6E3B1] dark:bg-[#24402B] border-[#546C37] dark:border-[#6E8F47] shadow-xs'
                    : 'bg-white/80 dark:bg-[#16241A]/80 hover:bg-white dark:hover:bg-[#16241A] border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:border-[#ADCA88] dark:hover:border-[#3C5A40]'
                }`}
              >
                {/* Delete confirmation inline */}
                {isPending ? (
                  <div className="space-y-1.5 animate-in fade-in duration-150 p-1">
                    <p className="text-[11px] font-bold text-[#941C2F] dark:text-[#FF9FAE] leading-tight">
                      ¿Eliminar esta consulta y sus mensajes?
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={(e) => handleConfirmDelete(s.id, e)}
                        className="py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionPendingDelete(null);
                        }}
                        className="py-1 px-2 bg-white dark:bg-[#16241A] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88] dark:border-[#3C5A40] rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] truncate font-['Space_Grotesk']">
                        {s.title}
                      </h4>
                      <p className="text-[10px] text-[#546C37]/70 dark:text-[#CFE3A8]/70 truncate mt-0.5">
                        {s.lastMessage || s.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-[#546C37]/60 dark:text-[#CFE3A8]/60 font-mono">
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {s.messageCount} msgs
                        </span>
                      </div>
                    </div>

                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionPendingDelete(s.id);
                        }}
                        title="Eliminar consulta"
                        className="p-1 rounded-lg text-[#546C37]/40 dark:text-[#CFE3A8]/40 hover:text-[#941C2F] dark:hover:text-[#FF9FAE] hover:bg-[#FDC2B1]/40 dark:hover:bg-[#4A2530]/40 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 ${
        hasGuestBanner ? 'h-[calc(100dvh-97px)]' : 'h-[calc(100dvh-65px)]'
      } max-w-7xl mx-auto w-full px-2 sm:px-4 pt-2 sm:pt-3 pb-16 md:pb-3 overflow-hidden`}
    >
      {/* Top Session Sub-Header Card (matching ChatActivoMovil.png & DesktopIDE.png) */}
      <div className="bg-[#FFFBD9]/95 dark:bg-[#0F1A0F]/95 backdrop-blur-md rounded-2xl p-3 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-xs flex items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden md:block shrink-0">
            <NewtonMascot size={36} mood="happy" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-[#546C37] dark:text-[#CFE3A8] truncate font-['Space_Grotesk']">
                {activeTopic}
              </h2>
              <span className="bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] text-[10px] font-bold px-2 py-0.5 rounded-full hidden md:flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                En línea
              </span>
            </div>
            <p className="text-[11px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 font-['Space_Grotesk'] truncate">
              Física Aplicada • UCSUR 2026-I
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile History Toggle Button */}
          <button
            onClick={() => setIsMobileHistoryOpen(true)}
            title="Ver historial de consultas"
            className="md:hidden p-1.5 px-2.5 rounded-xl bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <History className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
            <span className="text-[11px] font-bold">{sessions.length}</span>
          </button>

          {/* New Consultation Button with Plus Icon */}
          <button
            onClick={onNewSession}
            title="Iniciar nueva consulta sin borrar la anterior"
            className="py-1.5 px-3 rounded-xl bg-[#FA8989] hover:bg-[#FA8989]/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Consulta</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-[#D6E3B1] dark:bg-[#24402B] hidden md:flex items-center justify-center text-[#546C37] dark:text-[#CFE3A8]">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Central chat stream and right syllabus panel */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">

        {/* Central Chat Stream */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#FFFBD9]/50 dark:bg-[#0F1A0F]/50 rounded-3xl border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 shadow-xs overflow-hidden">
          {/* Scrollable Message List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 px-3 text-center max-w-lg mx-auto space-y-4 animate-in fade-in duration-300">
                <NewtonMascot size={88} mood="happy" animated />
                <div className="bg-[#FDC2B1] dark:bg-[#4A2530] text-[#3D121A] dark:text-[#FBE9E4] rounded-3xl p-5 shadow-sm border border-[#FA8989]/40 dark:border-[#8A3A4A]/40 space-y-2 text-left w-full">
                  <div className="flex items-center gap-2 pb-1 border-b border-[#3D121A]/10 dark:border-[#FBE9E4]/10 text-[11px] font-mono font-bold text-[#941C2F] dark:text-[#FF9FAE]">
                    <span>Newton AI • Tutor de Física Aplicada (UCSUR)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-['Space_Grotesk'] leading-relaxed">
                    ¡Hola! Soy <strong>Newton</strong>, tu tutor personal para el curso de Física Aplicada. Estoy listo para ayudarte a derivar fórmulas, comprobar cálculos paso a paso y resolver ejercicios de los 4 módulos: Electrostática, Electrodinámica, Magnetismo y Electrónica.
                  </p>
                  <p className="text-[11px] text-[#3D121A]/80 dark:text-[#FBE9E4]/80 font-['Space_Grotesk']">
                    ¿Qué ejercicio o concepto examinamos hoy? Puedes escribirlo, dictármelo con el botón de micrófono o escanearlo con la cámara.
                  </p>
                </div>

                <div className="w-full space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono font-bold text-[#546C37]/80 dark:text-[#CFE3A8]/80 block text-left">
                    Preguntas sugeridas para iniciar:
                  </span>
                  <div className="flex flex-col gap-1.5 text-left">
                    {[
                      '¿Por qué el campo eléctrico dentro de un conductor en equilibrio es cero?',
                      'Calcula la fuerza de Coulomb para q1 = 4 µC y q2 = -2 µC separadas r = 0.5 m.',
                      'Resuelve un circuito con ley de Ohm para V = 12 V y R = 6 Ω, hallando corriente y potencia.',
                      'Calcula la constante tau en un circuito RC con R = 10 kΩ y C = 100 µF.',
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChip(q)}
                        className="bg-white/90 dark:bg-[#16241A]/90 hover:bg-[#FFFBD9] dark:hover:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] text-xs font-medium p-2.5 rounded-2xl border border-[#ADCA88] dark:border-[#3C5A40] transition-all shadow-xs text-left flex items-center justify-between group active:scale-[0.99] cursor-pointer"
                      >
                        <span>→ {q}</span>
                        <Sparkles className="w-3.5 h-3.5 text-[#FA8989] group-hover:scale-110 transition-transform shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                >
                  {/* Sender & Timestamp Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-2 text-[11px] font-medium text-[#546C37]/70 dark:text-[#CFE3A8]/70 font-mono">
                    {!isUser && (
                      <NewtonMascot
                        size={18}
                        mood={msg.diagramLoading ? 'thinking' : 'happy'}
                        animated={msg.diagramLoading}
                      />
                    )}
                    <span>{isUser ? 'Estudiante' : 'Newton AI'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {!isUser && !msg.isError && (
                      <button
                        onClick={() => handleToggleSpeech(msg.id, msg.text)}
                        title="Escuchar con Text-to-Speech"
                        className="ml-2 p-1 rounded hover:bg-[#FDC2B1] dark:hover:bg-[#4A2530] text-[#941C2F] dark:text-[#FF9FAE] transition-colors"
                      >
                        {speakingMessageId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Bubble Container: User in #D6E3B1, Bot in #FDC2B1 or #FFF2EE if error */}
                  <div
                    className={`rounded-3xl p-4 sm:p-5 max-w-[94%] sm:max-w-[85%] shadow-xs transition-all ${
                      isUser
                        ? 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] rounded-tr-none font-medium'
                        : msg.isError
                        ? 'bg-[#FFF2EE] dark:bg-[#3A1820] text-[#941C2F] dark:text-[#FF9FAE] border-2 border-[#FA8989] dark:border-[#8A3A4A] rounded-tl-none'
                        : 'bg-[#FDC2B1] dark:bg-[#4A2530] text-[#3D121A] dark:text-[#FBE9E4] rounded-tl-none'
                    }`}
                  >

                    {!isUser && msg.isError && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[#941C2F]/20 dark:border-[#FF9FAE]/20 text-[11px] font-mono font-bold text-[#941C2F] dark:text-[#FF9FAE]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Aviso de Conexión</span>
                      </div>
                    )}

                    {/* Image Attachment if present */}
                    {msg.imageUrl ? (
                      <div className="mb-3 rounded-2xl overflow-hidden border border-[#546C37]/20 dark:border-[#3C5A40]/40 max-w-sm">
                        <img src={msg.imageUrl} alt="Ejercicio adjunto" className="w-full h-auto object-cover" />
                      </div>
                    ) : msg.imageNote ? (
                      <div className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 dark:bg-[#16241A]/70 text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-semibold border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-xs">
                        <Camera className="w-3.5 h-3.5 text-[#941C2F] dark:text-[#FF9FAE]" />
                        <span>{msg.imageNote}</span>
                      </div>
                    ) : null}

                    {/* Message Body Text */}
                    {msg.isError ? (
                      <div className="text-xs sm:text-sm font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    ) : (
                      <div className={`text-xs sm:text-sm font-['Space_Grotesk'] leading-relaxed newton-markdown ${isUser ? 'newton-markdown-user' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Diagram Loading State (hidden while diagram generator is temporarily disabled) */}
                    {DIAGRAMS_ENABLED && msg.diagramLoading && (
                      <div className="mt-3.5 p-3.5 rounded-2xl bg-[#FFFBD9]/90 dark:bg-[#0F1A0F]/90 border border-[#ADCA88] dark:border-[#3C5A40] flex items-center gap-3 animate-in fade-in duration-300">
                        <NewtonMascot size={40} mood="thinking" animated />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-ping"></span>
                            <span className="text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] font-mono">
                              Generando diagrama técnico...
                            </span>
                          </div>
                          <p className="text-[11px] text-[#546C37] dark:text-[#CFE3A8] mt-0.5 font-['Space_Grotesk']">
                            Newton está ilustrando el esquema técnico con flechas de dirección y polaridades...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Generated Diagram Image */}
                    {msg.diagramUrl && (
                      <div className="mt-3.5 rounded-2xl overflow-hidden border border-[#546C37]/30 dark:border-[#3C5A40] bg-white dark:bg-[#16241A] shadow-xs animate-in zoom-in-95 duration-200">
                        <div className="px-3 py-1.5 bg-[#FFFBD9] dark:bg-[#0F1A0F] border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 flex items-center justify-between text-[11px] font-mono font-bold text-[#546C37] dark:text-[#CFE3A8]">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#941C2F] dark:text-[#FF9FAE]" />
                            Diagrama Técnico
                          </span>
                          <a
                            href={msg.diagramUrl}
                            download="diagrama-newton.jpg"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <span>Descargar</span>
                          </a>
                        </div>
                        <div className="p-2 bg-white dark:bg-[#16241A] flex items-center justify-center">
                          <DiagramImage
                            url={msg.diagramUrl}
                            onRetry={
                              DIAGRAMS_ENABLED && msg.diagramPrompt && onRetryDiagram
                                ? () => onRetryDiagram(msg.id, msg.diagramPrompt!)
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* Diagram Offer: hidden while /api/diagram is temporarily disabled (503) */}
                    {DIAGRAMS_ENABLED && msg.diagramPrompt && !msg.diagramUrl && !msg.diagramLoading && !msg.diagramError && onRetryDiagram && (
                      <div className="mt-3 p-3 rounded-2xl bg-[#FFFBD9]/90 dark:bg-[#0F1A0F]/90 border border-[#ADCA88] dark:border-[#3C5A40] flex items-center justify-between gap-2.5 text-xs text-[#546C37] dark:text-[#CFE3A8] animate-in fade-in duration-200">
                        <span className="text-[11px] font-['Space_Grotesk']">
                          Newton puede dibujar un diagrama de este problema. ¿Quieres verlo?
                        </span>
                        <button
                          onClick={() => onRetryDiagram(msg.id, msg.diagramPrompt!)}
                          className="shrink-0 py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generar diagrama</span>
                        </button>
                      </div>
                    )}

                    {/* Diagram Error Notification */}
                    {DIAGRAMS_ENABLED && msg.diagramError && (
                      <div className="mt-3 p-3 rounded-2xl bg-[#FFF2EE] dark:bg-[#3A1820] border border-[#FA8989] dark:border-[#8A3A4A] flex items-start justify-between gap-2.5 text-xs text-[#941C2F] dark:text-[#FF9FAE] animate-in fade-in duration-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#941C2F] dark:text-[#FF9FAE]" />
                          <div>
                            <span className="font-bold block font-mono text-[11px]">Aviso sobre el diagrama</span>
                            <span className="text-[11px] font-['Space_Grotesk'] text-[#3D121A]/85 dark:text-[#FBE9E4]/85 block mt-0.5">
                              {msg.diagramError ||
                                'No se pudo generar el diagrama visual. Puedes continuar con el análisis analítico o reintentarlo.'}
                            </span>
                          </div>
                        </div>
                        {msg.diagramPrompt && onRetryDiagram && (
                          <button
                            onClick={() => onRetryDiagram(msg.id, msg.diagramPrompt!)}
                            className="shrink-0 py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reintentar</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Retry Button for Error Message */}
                    {msg.isError && (
                      <div className="mt-3 pt-2.5 border-t border-[#941C2F]/20 dark:border-[#FF9FAE]/20 flex items-center justify-end">
                        <button
                          onClick={() => {
                            if (msg.retryPrompt) {
                              onSendMessage(msg.retryPrompt, msg.retryImageBase64);
                            }
                          }}
                          className="py-1.5 px-3.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reintentar</span>
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Quick Chips suggestions below Newton's response (matching mockup) */}
                  {!isUser && msg.quickChips && msg.quickChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                      {msg.quickChips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendChip(chip)}
                          className="bg-white/90 dark:bg-[#16241A]/90 hover:bg-[#FFFBD9] dark:hover:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] text-[11px] font-medium px-3 py-1 rounded-full border border-[#ADCA88] dark:border-[#3C5A40] transition-all shadow-xs active:scale-95 text-left cursor-pointer"
                        >
                          → {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-sm">
                <NewtonMascot size={28} mood="thinking" animated />
                <div className="bg-[#FDC2B1] dark:bg-[#4A2530] rounded-3xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-2 text-xs text-[#3D121A] dark:text-[#FBE9E4]">
                  <span className="w-2 h-2 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-bounce [animation-delay:0.4s]"></span>
                  <span className="font-['Space_Grotesk'] text-xs font-semibold ml-1">
                    Newton está derivando la solución paso a paso...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Rounded Bottom Input Bar (strictly matching ChatActivoMovil.png) */}
          <div className="p-2 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-[#16241A]/90 backdrop-blur-md border-t border-[#ADCA88]/40 dark:border-[#3C5A40]/40 shrink-0">
            {attachedImage && (
              <div className="mb-2 flex items-center gap-2 px-2">
                <div className="relative inline-flex items-center gap-2 p-1.5 bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88] dark:border-[#3C5A40] rounded-2xl">
                  <img
                    src={attachedImage}
                    alt="Imagen adjunta"
                    className="w-10 h-10 object-cover rounded-xl"
                  />
                  <span className="text-[11px] font-mono text-[#546C37] dark:text-[#CFE3A8] pr-1">
                    Imagen lista
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    title="Quitar imagen adjunta"
                    className="p-1 rounded-full bg-[#FDC2B1] dark:bg-[#4A2530] text-[#941C2F] dark:text-[#FF9FAE] hover:opacity-80 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            <form
              onSubmit={handleSend}
              className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-1.5 sm:p-2 border-2 border-[#ADCA88] dark:border-[#3C5A40] shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#546C37] dark:focus-within:ring-[#6E8F47] transition-all"
            >
              <button
                type="button"
                onClick={onOpenScanner}
                title="Escanear ejercicio de libreta o apunte"
                className="w-9 h-9 rounded-full bg-white dark:bg-[#16241A] hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] border border-[#ADCA88]/60 dark:border-[#3C5A40]/60 text-[#546C37] dark:text-[#CFE3A8] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
              </button>

              <button
                type="button"
                onClick={onOpenVoice}
                title="Dictar duda a Newton con audio"
                className="w-9 h-9 rounded-full bg-[#FA8989] hover:bg-[#FA8989]/90 text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 shadow-xs cursor-pointer"
              >
                <Mic className="w-4 h-4 text-white" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handleInputPaste}
                placeholder="Pregúntale a Newton o formula una hipótesis..."
                disabled={isLoading || loadingMessages}
                className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-[#546C37] dark:text-[#CFE3A8] placeholder-[#546C37]/50 dark:placeholder-[#CFE3A8]/50 focus:outline-none font-['Space_Grotesk']"
              />

              {isLoading && onStopGeneration ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  title="Detener la respuesta de Newton"
                  className="h-9 px-3 rounded-full bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Detener</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachedImage) || isLoading || loadingMessages}
                  className="w-9 h-9 rounded-full bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#546C37]/90 dark:hover:bg-[#6E8F47]/90 disabled:opacity-40 text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              )}
            </form>
            <p className="mt-1.5 mb-0.5 px-2 text-center text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 font-['Space_Grotesk']">
              Newton es una IA y puede cometer errores. Verifica los cálculos y resultados importantes.
            </p>
          </div>
        </div>

        {/* Mobile History Drawer Overlay */}
        {isMobileHistoryOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            <div className="w-4/5 max-w-sm bg-[#FFFBD9] dark:bg-[#0F1A0F] h-full p-4 flex flex-col shadow-2xl border-l border-[#ADCA88] dark:border-[#3C5A40]">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40">
                <span className="font-bold text-sm text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans']">
                  Consultas Previas
                </span>
                <button
                  onClick={() => setIsMobileHistoryOpen(false)}
                  className="p-1 rounded-full hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] text-[#546C37] dark:text-[#CFE3A8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderSessionList()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
