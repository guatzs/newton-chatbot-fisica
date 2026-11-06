import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { SimulatorsView } from './components/SimulatorsView';
import { FormulasView } from './components/FormulasView';
import { ScannerModal } from './components/ScannerModal';
import { VoiceModal } from './components/VoiceModal';
import { ChatSession, ChatMessage, CourseModuleId } from './types';
import { 
  fetchAllSessions, 
  saveSessionToStorage, 
  fetchMessagesForSession, 
  saveMessageToStorage, 
  deleteSessionFromStorage 
} from './firebase';
import { Home, MessageSquare, Activity, User, BookOpen } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'simulators' | 'formulas'>('home');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [selectedSimulator, setSelectedSimulator] = useState<string>('conductor_gauss');

  // Load user sessions on mount from Firestore / Local cache
  useEffect(() => {
    async function loadInitial() {
      try {
        const storedSessions = await fetchAllSessions();
        if (storedSessions.length > 0) {
          setSessions(storedSessions);
          const latest = storedSessions[0];
          setCurrentSessionId(latest.id);
          const msgs = await fetchMessagesForSession(latest.id);
          setMessages(msgs);
        } else {
          setSessions([]);
          setCurrentSessionId('');
          setMessages([]);
        }
      } catch (err) {
        console.warn('Error loading initial user sessions:', err);
      }
    }
    loadInitial();
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const msgs = await fetchMessagesForSession(sessionId);
    setMessages(msgs);
    setActiveTab('chat');
  };

  const handleCreateNewSession = async (title: string, moduleId: CourseModuleId = 'electrostatica'): Promise<string> => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title,
      topic: `${moduleId.toUpperCase()} • Consulta`,
      moduleId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      lastMessage: '',
    };
    await saveSessionToStorage(newSession);
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([]);
    return newId;
  };

  const handleSendMessage = async (
    text: string, 
    imageBase64?: string, 
    explicitSessionId?: string, 
    initialMessages?: ChatMessage[],
    isVision = false
  ) => {
    let targetSessionId = explicitSessionId || currentSessionId;
    if (!targetSessionId) {
      targetSessionId = await handleCreateNewSession(text.slice(0, 35) + '...');
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sessionId: targetSessionId,
      sender: 'user',
      text,
      imageUrl: imageBase64,
      timestamp: timeString,
    };

    // Determine the base messages for history and state (clean any error messages)
    const baseMessages = (initialMessages !== undefined ? initialMessages : messages).filter((m) => !m.isError);

    setMessages((prev) => {
      const base = (initialMessages !== undefined ? initialMessages : prev).filter((m) => !m.isError);
      return [...base, userMsg];
    });
    await saveMessageToStorage(targetSessionId, userMsg);

    setIsLoading(true);

    try {
      const endpoint = isVision || imageBase64 ? '/api/vision' : '/api/chat';
      let res: Response;

      if (endpoint === '/api/vision') {
        res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            imageBase64,
            imageMimeType: imageBase64?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          }),
        });
      } else {
        // Build conversation history for context, strictly ensuring it starts with role 'user'
        let history = baseMessages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

        // Trim leading 'model' messages so history always begins with 'user'
        while (history.length > 0 && history[0].role !== 'user') {
          history.shift();
        }

        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            history,
            imageBase64,
            imageMimeType: imageBase64?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          }),
        });
      }

      if (!res.ok) {
        let errMessage = `Error de servidor (${res.status})`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await res.json();
            if (errJson.error) errMessage = errJson.error;
          } else {
            const errText = await res.text();
            if (errText.includes('<!doctype') || errText.includes('<html')) {
              errMessage = 'El servidor no pudo procesar la solicitud en este momento.';
            } else if (errText.trim()) {
              errMessage = errText.slice(0, 150);
            }
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Respuesta inesperada del servidor (no es JSON válido).');
      }

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sessionId: targetSessionId,
        sender: 'bot',
        text: data.text,
        quickChips: data.quickChips || [],
        simulationType: data.simulationType,
        timestamp: botTime,
        diagramPrompt: data.diagramPrompt,
        diagramLoading: Boolean(data.diagramPrompt),
      };

      setMessages((prev) => {
        const clean = prev.filter((m) => !m.isError);
        const hasUser = clean.some((m) => m.id === userMsg.id);
        return hasUser ? [...clean, botMsg] : [...clean, userMsg, botMsg];
      });
      await saveMessageToStorage(targetSessionId, botMsg);

      // If Gemini suggested a diagram or user requested one, fetch /api/diagram with Imagen
      if (data.diagramPrompt) {
        fetch('/api/diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: data.diagramPrompt }),
        })
          .then(async (diagramRes) => {
            if (!diagramRes.ok) {
              const errBody = await diagramRes.json().catch(() => ({}));
              throw new Error(errBody.error || `HTTP ${diagramRes.status}`);
            }
            return diagramRes.json();
          })
          .then((diagramData) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsg.id
                  ? {
                      ...m,
                      diagramLoading: false,
                      diagramUrl: diagramData.imageUrl,
                      diagramError: undefined,
                    }
                  : m
              )
            );
          })
          .catch((diagramErr: any) => {
            console.warn('Diagram generation failed:', diagramErr);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsg.id
                  ? {
                      ...m,
                      diagramLoading: false,
                      diagramError:
                        'No se pudo generar el diagrama visual con Imagen. Puedes continuar con el análisis analítico o reintentarlo.',
                    }
                  : m
              )
            );
          });
      }

      // Update session header using functional state updater
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === targetSessionId);
        if (idx >= 0) {
          const cur = prev[idx];
          const updated: ChatSession = {
            ...cur,
            updatedAt: new Date().toISOString(),
            messageCount: (cur.messageCount || 0) + 2,
            lastMessage: data.text.slice(0, 70) + '...',
          };
          saveSessionToStorage(updated);
          const updatedList = [...prev];
          updatedList[idx] = updated;
          return updatedList;
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Error contacting Newton AI:', err);
      const errorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sessionId: targetSessionId,
        sender: 'bot',
        text: 'No pude conectarme con Newton. Revisa tu conexión e inténtalo de nuevo.',
        isError: true,
        retryPrompt: text,
        retryImageBase64: imageBase64,
        timestamp: errorTime,
      };
      setMessages((prev) => {
        const clean = prev.filter((m) => !m.isError);
        const hasUser = clean.some((m) => m.id === userMsg.id);
        return hasUser ? [...clean, errorMsg] : [...clean, userMsg, errorMsg];
      });
      // Do not save errorMsg to Firestore
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryDiagram = async (messageId: string, diagramPrompt: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, diagramLoading: true, diagramError: undefined } : m
      )
    );

    try {
      const res = await fetch('/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: diagramPrompt }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, diagramLoading: false, diagramUrl: data.imageUrl, diagramError: undefined }
            : m
        )
      );
    } catch (err: any) {
      console.warn('Diagram retry failed:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                diagramLoading: false,
                diagramError:
                  'No se pudo generar el diagrama visual con Imagen. Puedes continuar con la resolución.',
              }
            : m
        )
      );
    }
  };

  const handleStartChatWithPrompt = async (prompt: string, moduleId: CourseModuleId = 'electrostatica') => {
    const newSessionId = await handleCreateNewSession(prompt.slice(0, 32) + '...', moduleId);
    setActiveTab('chat');
    await handleSendMessage(prompt, undefined, newSessionId, []);
  };

  const handleSolveWithScanner = async (data: { prompt: string; imageBase64: string; userNote?: string }) => {
    const title = data.userNote && data.userNote.trim()
      ? `Escaneo: ${data.userNote.slice(0, 24)}...`
      : 'Ejercicio Escaneado';
    const newSessionId = await handleCreateNewSession(title);
    setActiveTab('chat');
    await handleSendMessage(data.prompt, data.imageBase64, newSessionId, [], true);
  };

  const handleVoiceSubmit = async (prompt: string) => {
    const newSessionId = await handleCreateNewSession(`Dictado: ${prompt.slice(0, 24)}...`);
    setActiveTab('chat');
    await handleSendMessage(prompt, undefined, newSessionId, []);
  };

  const handleNewSession = () => {
    setMessages([]);
    setCurrentSessionId('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSessionFromStorage(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setMessages([]);
      setCurrentSessionId('');
    }
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="min-h-screen bg-[#FFFBD9] text-[#546C37] font-['Space_Grotesk'] flex flex-col selection:bg-[#FDC2B1] selection:text-[#941C2F]">
      {/* Desktop Fixed Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Top Header: shows mobile brand on small screens; on desktop offsets with md:pl-64 */}
      <div className="md:pl-64">
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
        />
      </div>

      {/* Main Content Area: offsets by md:pl-64 on desktop */}
      <main className={`flex-1 flex flex-col md:pl-64 ${activeTab === 'chat' ? 'pb-0' : 'pb-16'} md:pb-0`}>
        {activeTab === 'home' && (
          <HomeView
            onStartChatWithPrompt={handleStartChatWithPrompt}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onOpenSimulator={(sim) => {
              if (sim) setSelectedSimulator(sim);
              setActiveTab('simulators');
            }}
            onOpenFormulas={() => setActiveTab('formulas')}
            recentSessions={sessions}
            onSelectSession={handleSelectSession}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSendMessage={handleSendMessage}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            isLoading={isLoading}
            activeTopic={currentSession?.title || 'Tutoría de Física Aplicada'}
            activeModuleId={currentSession?.moduleId || 'electrostatica'}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRetryDiagram={handleRetryDiagram}
          />
        )}

        {activeTab === 'simulators' && (
          <SimulatorsView
            initialSimulator={selectedSimulator}
            onAskNewton={(prompt) => {
              handleStartChatWithPrompt(prompt);
            }}
          />
        )}

        {activeTab === 'formulas' && (
          <FormulasView
            onAskAboutFormula={(name, latex) => {
              handleStartChatWithPrompt(`Por favor resuelve un problema práctico paso a paso aplicando la fórmula de ${name}: ${latex}`);
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (matching MovilHome.png & ChatActivoMovil.png) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFBD9]/95 backdrop-blur-md border-t border-[#ADCA88]/50 px-6 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('home')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'home' ? 'text-[#941C2F] bg-[#D6E3B1]/60 font-bold' : 'text-[#546C37]/70'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all relative ${
            activeTab === 'chat' ? 'text-[#941C2F] bg-[#D6E3B1]/60 font-bold' : 'text-[#546C37]/70'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Chat</span>
          {messages.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#FA8989]"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulators')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'simulators' ? 'text-[#941C2F] bg-[#D6E3B1]/60 font-bold' : 'text-[#546C37]/70'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('formulas')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'formulas' ? 'text-[#941C2F] bg-[#D6E3B1]/60 font-bold' : 'text-[#546C37]/70'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Fórmulas</span>
        </button>
      </nav>

      {/* Optical Exercise Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSolveWithAI={handleSolveWithScanner}
      />

      {/* Voice Dictation Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSubmitVoicePrompt={handleVoiceSubmit}
      />
    </div>
  );
}
