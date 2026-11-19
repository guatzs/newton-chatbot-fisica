import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { SimulatorsView } from './components/SimulatorsView';
import { FormulasView } from './components/FormulasView';
import { ScannerModal } from './components/ScannerModal';
import { VoiceModal } from './components/VoiceModal';
import { LoginScreen } from './components/LoginScreen';
import { VerifyEmailScreen } from './components/VerifyEmailScreen';
import { ConfirmGuestSignInModal } from './components/ConfirmGuestSignInModal';
import { ChatSession, ChatMessage, CourseModuleId } from './types';
import { 
  auth,
  fetchAllSessions, 
  saveSessionToStorage, 
  fetchMessagesForSession, 
  saveMessageToStorage, 
  deleteSessionFromStorage,
  uploadSessionImage,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  checkRedirectResult,
  needsEmailVerification
} from './firebase';
import { Home, MessageSquare, Activity, BookOpen } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { userAskedForDiagram } from './utils/diagramUrl';

type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'google' | 'verifyEmail';

export default function App() {
  const { toggleTheme, isDark } = useTheme();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userVersion, setUserVersion] = useState<number>(0);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConfirmSignInOpen, setIsConfirmSignInOpen] = useState<boolean>(false);
  const [guestLoginError, setGuestLoginError] = useState<string | null>(null);
  const [hasGuestBackup, setHasGuestBackup] = useState<boolean>(false);
  const guestBackupRef = useRef<{
    sessions: ChatSession[];
    messages: ChatMessage[];
    currentSessionId: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'simulators' | 'formulas'>('home');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [selectedSimulator, setSelectedSimulator] = useState<string>('conductor_gauss');

  const selectRequestIdRef = useRef<number>(0);
  const currentSessionIdRef = useRef<string>('');
  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionsRef = useRef<ChatSession[]>([]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Firebase auth state subscription & redirect check
  useEffect(() => {
    let isMounted = true;

    checkRedirectResult().then((user) => {
      if (user && isMounted) {
        if (needsEmailVerification(user)) {
          setCurrentUser(user);
          setAuthStatus('verifyEmail');
          setAuthError(null);
          return;
        }
        setCurrentUser(user);
        setAuthStatus('google');
      }
    }).catch(() => {});

    const unsubscribe = subscribeToAuth((user) => {
      if (!isMounted) return;
      if (user && needsEmailVerification(user)) {
        if (guestBackupRef.current) {
          guestBackupRef.current = null;
          setHasGuestBackup(false);
          setSessions([]);
          setMessages([]);
          setCurrentSessionId('');
        }
        setCurrentUser(user);
        setAuthStatus('verifyEmail');
        setAuthError(null);
        return;
      }
      if (user) {
        if (guestBackupRef.current) {
          guestBackupRef.current = null;
          setHasGuestBackup(false);
          setSessions([]);
          setMessages([]);
          setCurrentSessionId('');
        }
        setCurrentUser(user);
        setAuthStatus('google');
        setAuthError(null);
      } else {
        setCurrentUser(null);
        setAuthStatus((prev) => (prev === 'guest' ? 'guest' : 'signedOut'));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Load user sessions when authenticated via Google
  useEffect(() => {
    if (authStatus !== 'google') return;
    let isMounted = true;

    async function loadInitial() {
      const reqId = ++selectRequestIdRef.current;
      try {
        const storedSessions = await fetchAllSessions();
        if (!isMounted || selectRequestIdRef.current !== reqId) return;
        if (storedSessions.length > 0) {
          sessionsRef.current = storedSessions;
          setSessions(storedSessions);
          const latest = storedSessions[0];
          currentSessionIdRef.current = latest.id;
          setCurrentSessionId(latest.id);
          setLoadingMessages(true);
          const msgs = await fetchMessagesForSession(latest.id);
          if (isMounted && selectRequestIdRef.current === reqId) {
            messagesRef.current = msgs;
            setMessages(msgs);
            if (latest.messageCount !== msgs.length) {
              const synced = { ...latest, messageCount: msgs.length };
              sessionsRef.current = sessionsRef.current.map((s) => (s.id === latest.id ? synced : s));
              setSessions(sessionsRef.current);
              saveSessionToStorage(synced).catch(() => {});
            }
          }
        } else {
          sessionsRef.current = [];
          setSessions([]);
          currentSessionIdRef.current = '';
          setCurrentSessionId('');
          messagesRef.current = [];
          setMessages([]);
        }
      } catch (err) {
        console.warn('Error loading initial user sessions:', err);
      } finally {
        if (isMounted && selectRequestIdRef.current === reqId) {
          setLoadingMessages(false);
        }
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [authStatus]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        // onAuthStateChanged updates authStatus to 'google'
      } else if (res.cancelled) {
        // Closed popup: reset button without error
      } else if (res.errorMessage) {
        setAuthError(res.errorMessage);
      }
    } catch {
      setAuthError('No pudimos conectar con Google. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestLogin = () => {
    setIsSigningIn(true);
    setTimeout(() => {
      guestBackupRef.current = null;
      setHasGuestBackup(false);
      sessionsRef.current = [];
      messagesRef.current = [];
      currentSessionIdRef.current = '';
      setSessions([]);
      setMessages([]);
      setCurrentSessionId('');
      setAuthError(null);
      setIsSigningIn(false);
      setAuthStatus('guest');
    }, 400);
  };

  const handleRequestSignInFromGuest = () => {
    // If current conversation has messages, confirm with dialog before transitioning to login
    if (messages.length > 0) {
      setIsConfirmSignInOpen(true);
    } else {
      executeSignInFromGuest();
    }
  };

  const executeSignInFromGuest = () => {
    setIsConfirmSignInOpen(false);
    setGuestLoginError(null);
    setAuthError(null);
    guestBackupRef.current = {
      sessions,
      messages,
      currentSessionId,
    };
    setHasGuestBackup(true);
    setAuthStatus('signedOut');
  };

  const handleBackToGuest = () => {
    const backup = guestBackupRef.current;
    if (backup) {
      sessionsRef.current = backup.sessions;
      messagesRef.current = backup.messages;
      currentSessionIdRef.current = backup.currentSessionId;
      setSessions(backup.sessions);
      setMessages(backup.messages);
      setCurrentSessionId(backup.currentSessionId);
      guestBackupRef.current = null;
      setHasGuestBackup(false);
    }
    setAuthError(null);
    setAuthStatus('guest');
  };

  const handleEmailVerified = () => {
    setUserVersion((v) => v + 1);
    setAuthStatus('google');
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    guestBackupRef.current = null;
    setHasGuestBackup(false);
    sessionsRef.current = [];
    messagesRef.current = [];
    currentSessionIdRef.current = '';
    setSessions([]);
    setMessages([]);
    setCurrentSessionId('');
    setActiveTab('home');
    setAuthStatus('signedOut');
  };

  const handleSelectSession = async (sessionId: string) => {
    const reqId = ++selectRequestIdRef.current;
    currentSessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
    setActiveTab('chat');
    setLoadingMessages(true);
    messagesRef.current = [];
    setMessages([]);

    try {
      const msgs = await fetchMessagesForSession(sessionId);
      if (selectRequestIdRef.current !== reqId) return;

      messagesRef.current = msgs;
      setMessages(msgs);

      const targetSession = sessionsRef.current.find((s) => s.id === sessionId);
      if (targetSession) {
        const updatedSession: ChatSession = {
          ...targetSession,
          messageCount: msgs.length,
        };
        sessionsRef.current = sessionsRef.current.map((s) =>
          s.id === sessionId ? updatedSession : s
        );
        setSessions(sessionsRef.current);
        if (targetSession.messageCount !== msgs.length) {
          saveSessionToStorage(updatedSession).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Error loading session messages:', err);
    } finally {
      if (selectRequestIdRef.current === reqId) {
        setLoadingMessages(false);
      }
    }
  };

  const handleCreateNewSession = (title: string, moduleId: CourseModuleId = 'electrostatica'): string => {
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
    // Non-blocking background save to storage (offline-tolerant)
    saveSessionToStorage(newSession).catch(() => {});
    sessionsRef.current = [newSession, ...sessionsRef.current];
    setSessions(sessionsRef.current);
    currentSessionIdRef.current = newId;
    setCurrentSessionId(newId);
    messagesRef.current = [];
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
    if (!explicitSessionId && loadingMessages) {
      return;
    }

    const timerId = `[Chat UI] handleSendMessage_${Date.now()}`;
    console.time(timerId);
    setIsLoading(true);

    let targetSessionId = explicitSessionId || currentSessionIdRef.current || currentSessionId;
    if (!targetSessionId) {
      targetSessionId = handleCreateNewSession(text.slice(0, 35) + '...');
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userCreatedAt = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sessionId: targetSessionId,
      sender: 'user',
      text,
      imageUrl: imageBase64,
      timestamp: timeString,
      createdAt: userCreatedAt,
    };

    // Determine base messages for THIS session only (clean any previous error messages)
    const sourceMessages = initialMessages !== undefined ? initialMessages : messagesRef.current;
    const baseMessages = sourceMessages.filter(
      (m) => !m.isError && m.sessionId === targetSessionId
    );

    // Update UI immediately with user message
    const updatedWithUser = [...baseMessages, userMsg];
    messagesRef.current = updatedWithUser;
    setMessages(updatedWithUser);

    // Non-blocking background save for user message (uploads image if present)
    saveMessageToStorage(targetSessionId, userMsg).catch(() => {});

    const isVisionRequest = isVision || Boolean(imageBase64);

    try {
      if (isVisionRequest) {
        // Non-streaming vision analysis flow (/api/vision)
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            imageBase64,
            imageMimeType: imageBase64?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Error ${res.status} en análisis visual`);
        }

        const data = await res.json();
        const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const botCreatedAt = new Date(
          Math.max(Date.now(), Date.parse(userCreatedAt) + 1)
        ).toISOString();

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sessionId: targetSessionId,
          sender: 'bot',
          text: data.text,
          quickChips: data.quickChips || [],
          ...(data.simulationType !== undefined ? { simulationType: data.simulationType } : {}),
          ...(data.simulationParams !== undefined ? { simulationParams: data.simulationParams } : {}),
          ...(data.simulationAdjusted !== undefined ? { simulationAdjusted: data.simulationAdjusted } : {}),
          timestamp: botTime,
          createdAt: botCreatedAt,
          ...(data.diagramPrompt !== undefined ? { diagramPrompt: data.diagramPrompt } : {}),
          diagramLoading: Boolean(data.diagramPrompt) && userAskedForDiagram(text),
        };

        let nextMessageCount = baseMessages.length + 2;
        if (currentSessionIdRef.current === targetSessionId) {
          const clean = messagesRef.current.filter((m) => !m.isError && m.sessionId === targetSessionId);
          const hasUser = clean.some((m) => m.id === userMsg.id);
          const next = hasUser ? [...clean, botMsg] : [...clean, userMsg, botMsg];
          messagesRef.current = next;
          setMessages(next);
          nextMessageCount = next.length;
        }

        saveMessageToStorage(targetSessionId, botMsg).catch(() => {});

        // Diagram fetching for vision result if proposed
        if (data.diagramPrompt && userAskedForDiagram(text)) {
          triggerDiagramGeneration(botMsg.id, data.diagramPrompt, botMsg);
        }

        persistSessionHeader(targetSessionId, data.text, nextMessageCount);
      } else {
        // SSE Streaming chat flow (/api/chat)
        let history = baseMessages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

        while (history.length > 0 && history[0].role !== 'user') {
          history.shift();
        }

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            history,
            imageBase64,
            imageMimeType: imageBase64?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          }),
        });

        if (!res.ok) {
          let errMessage = `Error de servidor (${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson.error) errMessage = errJson.error;
          } catch (_) {}
          throw new Error(errMessage);
        }

        const botId = `bot-${Date.now()}`;
        const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const botCreatedAt = new Date(
          Math.max(Date.now(), Date.parse(userCreatedAt) + 1)
        ).toISOString();

        const initialBotMsg: ChatMessage = {
          id: botId,
          sessionId: targetSessionId,
          sender: 'bot',
          text: '',
          quickChips: [],
          timestamp: botTime,
          createdAt: botCreatedAt,
        };

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('No se pudo iniciar el flujo de lectura del streaming.');
        }

        const decoder = new TextDecoder();
        let accumulatedStreamText = '';
        let sseBuffer = '';
        let rafId: number | null = null;
        let updateScheduled = false;

        // Group live UI updates with requestAnimationFrame to prevent re-render bottlenecks
        const scheduleUiUpdate = (currentText: string) => {
          if (updateScheduled) return;
          updateScheduled = true;
          rafId = requestAnimationFrame(() => {
            updateScheduled = false;
            if (currentSessionIdRef.current !== targetSessionId) return;
            const clean = messagesRef.current.filter(
              (m) => !m.isError && m.sessionId === targetSessionId
            );
            const exists = clean.some((m) => m.id === botId);
            const next = exists
              ? clean.map((m) => (m.id === botId ? { ...m, text: currentText } : m))
              : [...clean, { ...initialBotMsg, text: currentText }];
            messagesRef.current = next;
            setMessages(next);
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payloadRaw = trimmed.slice(5).trim();
            if (!payloadRaw) continue;

            try {
              const eventData = JSON.parse(payloadRaw);

              if (eventData.type === 'chunk' && eventData.text) {
                accumulatedStreamText += eventData.text;
                scheduleUiUpdate(accumulatedStreamText);
              } else if (eventData.type === 'done') {
                if (rafId) cancelAnimationFrame(rafId);
                updateScheduled = false;

                const finalCleanText = eventData.text || accumulatedStreamText;
                const finalBotMsg: ChatMessage = {
                  id: botId,
                  sessionId: targetSessionId,
                  sender: 'bot',
                  text: finalCleanText,
                  quickChips: eventData.quickChips || [],
                  ...(eventData.simulationType !== undefined ? { simulationType: eventData.simulationType } : {}),
                  ...(eventData.simulationParams !== undefined ? { simulationParams: eventData.simulationParams } : {}),
                  ...(eventData.simulationAdjusted !== undefined ? { simulationAdjusted: eventData.simulationAdjusted } : {}),
                  timestamp: botTime,
                  createdAt: botCreatedAt,
                  ...(eventData.diagramPrompt !== undefined ? { diagramPrompt: eventData.diagramPrompt } : {}),
                  diagramLoading: Boolean(eventData.diagramPrompt) && userAskedForDiagram(text),
                };

                let nextMessageCount = baseMessages.length + 2;
                if (currentSessionIdRef.current === targetSessionId) {
                  const clean = messagesRef.current.filter(
                    (m) => !m.isError && m.sessionId === targetSessionId
                  );
                  const hasUser = clean.some((m) => m.id === userMsg.id);
                  const exists = clean.some((m) => m.id === botId);
                  const next = exists
                    ? clean.map((m) => (m.id === botId ? finalBotMsg : m))
                    : hasUser
                    ? [...clean, finalBotMsg]
                    : [...clean, userMsg, finalBotMsg];
                  messagesRef.current = next;
                  setMessages(next);
                  nextMessageCount = next.length;
                }

                // Background save of finished bot message
                saveMessageToStorage(targetSessionId, finalBotMsg).catch(() => {});

                // If diagram prompt was generated, call /api/diagram
                if (eventData.diagramPrompt && userAskedForDiagram(text)) {
                  triggerDiagramGeneration(botId, eventData.diagramPrompt, finalBotMsg);
                }

                persistSessionHeader(targetSessionId, finalCleanText, nextMessageCount);
              } else if (eventData.type === 'error') {
                throw new Error(eventData.error || 'Error en streaming de respuesta');
              }
            } catch (pErr: any) {
              if (pErr?.message && !pErr.message.includes('JSON')) {
                throw pErr;
              }
            }
          }
        }
      }
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
        createdAt: new Date(Math.max(Date.now(), Date.parse(userCreatedAt) + 1)).toISOString(),
      };
      if (currentSessionIdRef.current === targetSessionId) {
        const clean = messagesRef.current.filter(
          (m) => !m.isError && m.sessionId === targetSessionId
        );
        const hasUser = clean.some((m) => m.id === userMsg.id);
        const next = hasUser ? [...clean, errorMsg] : [...clean, userMsg, errorMsg];
        messagesRef.current = next;
        setMessages(next);
      }
    } finally {
      console.timeEnd(timerId);
      setIsLoading(false);
    }
  };

  const triggerDiagramGeneration = (
    messageId: string,
    diagramPrompt: string,
    baseBotMsg: ChatMessage
  ) => {
    fetch('/api/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: diagramPrompt }),
      signal: AbortSignal.timeout(30000),
    })
      .then(async (diagramRes) => {
        if (!diagramRes.ok) {
          const errBody = await diagramRes.json().catch(() => ({}));
          const err = new Error(errBody.error || `HTTP ${diagramRes.status}`);
          (err as any).statusCode = diagramRes.status;
          throw err;
        }
        return diagramRes.json();
      })
      .then(async (diagramData) => {
        const isAuthenticated = Boolean(auth.currentUser);
        if (!isAuthenticated) {
          if (currentSessionIdRef.current === baseBotMsg.sessionId) {
            const next = messagesRef.current.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    diagramLoading: false,
                    diagramUrl: diagramData.imageUrl,
                    diagramError: undefined,
                  }
                : m
            );
            messagesRef.current = next;
            setMessages(next);
          }
          return;
        }

        const uploadedUrl = await uploadSessionImage(
          baseBotMsg.sessionId,
          messageId,
          diagramData.imageUrl
        );

        if (uploadedUrl) {
          const updatedMsg: ChatMessage = {
            ...baseBotMsg,
            diagramLoading: false,
            diagramUrl: uploadedUrl,
          };
          delete updatedMsg.diagramError;

          if (currentSessionIdRef.current === baseBotMsg.sessionId) {
            const next = messagesRef.current.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    diagramLoading: false,
                    diagramUrl: uploadedUrl,
                    diagramError: undefined,
                  }
                : m
            );
            messagesRef.current = next;
            setMessages(next);
          }

          saveMessageToStorage(baseBotMsg.sessionId, updatedMsg).catch(() => {});
        } else {
          const storageError =
            'No se pudo guardar el diagrama visual en la nube. Puedes continuar con el análisis analítico o reintentarlo.';
          const updatedMsg: ChatMessage = {
            ...baseBotMsg,
            diagramLoading: false,
            diagramError: storageError,
          };
          delete updatedMsg.diagramUrl;

          if (currentSessionIdRef.current === baseBotMsg.sessionId) {
            const next = messagesRef.current.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    diagramLoading: false,
                    diagramError: storageError,
                  }
                : m
            );
            messagesRef.current = next;
            setMessages(next);
          }

          saveMessageToStorage(baseBotMsg.sessionId, updatedMsg).catch(() => {});
        }
      })
      .catch((diagramErr: any) => {
        console.warn('Diagram generation failed:', diagramErr);
        const statusCode = diagramErr?.statusCode;
        const errText =
          statusCode === 429 || statusCode === 403 || statusCode === 400
            ? diagramErr.message
            : 'No se pudo generar el diagrama visual. Puedes continuar con el análisis analítico o reintentarlo.';
        const failedMsg: ChatMessage = {
          ...baseBotMsg,
          diagramLoading: false,
          diagramError: errText,
        };
        delete failedMsg.diagramUrl;

        if (currentSessionIdRef.current === baseBotMsg.sessionId) {
          const next = messagesRef.current.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  diagramLoading: false,
                  diagramError: errText,
                }
              : m
          );
          messagesRef.current = next;
          setMessages(next);
        }

        saveMessageToStorage(baseBotMsg.sessionId, failedMsg).catch(() => {});
      });
  };

  const persistSessionHeader = (
    targetSessionId: string,
    previewText: string,
    explicitMessageCount?: number
  ) => {
    const cur = sessionsRef.current.find((s) => s.id === targetSessionId);
    if (!cur) return;

    const realCount =
      explicitMessageCount ??
      messagesRef.current.filter((m) => !m.isError && m.sessionId === targetSessionId).length;

    const updated: ChatSession = {
      ...cur,
      updatedAt: new Date().toISOString(),
      messageCount: realCount > 0 ? realCount : (cur.messageCount || 0) + 2,
      lastMessage: previewText.slice(0, 70) + '...',
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === targetSessionId ? updated : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    saveSessionToStorage(updated).catch(() => {});
  };

  const handleRetryDiagram = async (messageId: string, diagramPrompt: string) => {
    const existingMsg = messagesRef.current.find((m) => m.id === messageId);
    const targetSessionId = existingMsg?.sessionId || currentSessionIdRef.current;

    if (currentSessionIdRef.current === targetSessionId) {
      const loadingNext = messagesRef.current.map((m) =>
        m.id === messageId ? { ...m, diagramLoading: true, diagramError: undefined } : m
      );
      messagesRef.current = loadingNext;
      setMessages(loadingNext);
    }

    try {
      const res = await fetch('/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: diagramPrompt }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const err = new Error(errBody.error || `HTTP ${res.status}`);
        (err as any).statusCode = res.status;
        throw err;
      }
      const data = await res.json();

      if (!auth.currentUser || !targetSessionId) {
        if (currentSessionIdRef.current === targetSessionId) {
          const next = messagesRef.current.map((m) =>
            m.id === messageId
              ? { ...m, diagramLoading: false, diagramUrl: data.imageUrl, diagramError: undefined }
              : m
          );
          messagesRef.current = next;
          setMessages(next);
        }
        return;
      }

      const uploadedUrl = await uploadSessionImage(targetSessionId, messageId, data.imageUrl);
      if (uploadedUrl) {
        if (currentSessionIdRef.current === targetSessionId) {
          const next = messagesRef.current.map((m) =>
            m.id === messageId
              ? { ...m, diagramLoading: false, diagramUrl: uploadedUrl, diagramError: undefined }
              : m
          );
          messagesRef.current = next;
          setMessages(next);
        }

        if (existingMsg) {
          const updatedMsg: ChatMessage = {
            ...existingMsg,
            diagramLoading: false,
            diagramUrl: uploadedUrl,
          };
          delete updatedMsg.diagramError;
          saveMessageToStorage(targetSessionId, updatedMsg).catch(() => {});
        }
      } else {
        const storageErr =
          'No se pudo guardar el diagrama visual en la nube. Puedes continuar con la resolución o reintentarlo.';
        if (currentSessionIdRef.current === targetSessionId) {
          const next = messagesRef.current.map((m) =>
            m.id === messageId
              ? { ...m, diagramLoading: false, diagramError: storageErr }
              : m
          );
          messagesRef.current = next;
          setMessages(next);
        }
        if (existingMsg) {
          const failedMsg: ChatMessage = {
            ...existingMsg,
            diagramLoading: false,
            diagramError: storageErr,
          };
          delete failedMsg.diagramUrl;
          saveMessageToStorage(targetSessionId, failedMsg).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('Diagram retry failed:', err);
      const statusCode = err?.statusCode;
      const errText =
        statusCode === 429 || statusCode === 403 || statusCode === 400
          ? err.message
          : 'No se pudo generar el diagrama visual. Puedes continuar con la resolución.';
      if (currentSessionIdRef.current === targetSessionId) {
        const next = messagesRef.current.map((m) =>
          m.id === messageId
            ? {
                ...m,
                diagramLoading: false,
                diagramError: errText,
              }
            : m
        );
        messagesRef.current = next;
        setMessages(next);
      }
      if (existingMsg && targetSessionId) {
        const failedMsg: ChatMessage = {
          ...existingMsg,
          diagramLoading: false,
          diagramError: errText,
        };
        delete failedMsg.diagramUrl;
        saveMessageToStorage(targetSessionId, failedMsg).catch(() => {});
      }
    }
  };

  const handleStartChatWithPrompt = async (prompt: string, moduleId: CourseModuleId = 'electrostatica') => {
    const newSessionId = handleCreateNewSession(prompt.slice(0, 32) + '...', moduleId);
    setActiveTab('chat');
    await handleSendMessage(prompt, undefined, newSessionId, []);
  };

  const handleSolveWithScanner = async (data: {
    prompt: string;
    imageBase64: string;
    thumbnailBase64?: string;
    userNote?: string;
  }) => {
    const title =
      data.userNote && data.userNote.trim()
        ? `Escaneo: ${data.userNote.slice(0, 24)}...`
        : 'Ejercicio Escaneado';

    const newSessionId = `session-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSession: ChatSession = {
      id: newSessionId,
      title,
      topic: 'ELECTROSTATICA • Consulta',
      moduleId: 'electrostatica',
      createdAt: nowIso,
      updatedAt: nowIso,
      messageCount: 1,
      lastMessage: data.prompt.slice(0, 70) + '...',
    };

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sessionId: newSessionId,
      sender: 'user',
      text: data.prompt,
      // Store only the ~200px thumbnail in persistent state/storage; never store full 1280px base64
      ...(data.thumbnailBase64 ? { imageUrl: data.thumbnailBase64 } : { imageNote: 'Imagen adjunta: ejercicio escaneado' }),
      timestamp: timeString,
      createdAt: nowIso,
    };

    // Update UI immediately without waiting for Firestore
    sessionsRef.current = [newSession, ...sessionsRef.current];
    setSessions(sessionsRef.current);
    currentSessionIdRef.current = newSessionId;
    setCurrentSessionId(newSessionId);
    messagesRef.current = [userMsg];
    setMessages([userMsg]);
    setActiveTab('chat');
    setIsLoading(true);

    // Persist session and user message in parallel without blocking /api/vision
    Promise.allSettled([
      saveSessionToStorage(newSession),
      saveMessageToStorage(newSessionId, userMsg),
    ]);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          imageBase64: data.imageBase64,
          imageMimeType: data.imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error ${res.status} en análisis visual`);
      }

      const resData = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botCreatedAt = new Date(
        Math.max(Date.now(), Date.parse(nowIso) + 1)
      ).toISOString();
      const shouldAutoGenerateDiagram =
        Boolean(resData.diagramPrompt) && userAskedForDiagram(data.prompt);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sessionId: newSessionId,
        sender: 'bot',
        text: resData.text,
        quickChips: resData.quickChips || [],
        ...(resData.simulationType !== undefined ? { simulationType: resData.simulationType } : {}),
        ...(resData.simulationParams !== undefined ? { simulationParams: resData.simulationParams } : {}),
        ...(resData.simulationAdjusted !== undefined ? { simulationAdjusted: resData.simulationAdjusted } : {}),
        timestamp: botTime,
        createdAt: botCreatedAt,
        ...(resData.diagramPrompt !== undefined ? { diagramPrompt: resData.diagramPrompt } : {}),
        diagramLoading: shouldAutoGenerateDiagram,
      };

      const updatedSession: ChatSession = {
        ...newSession,
        updatedAt: new Date().toISOString(),
        messageCount: 2,
        lastMessage: resData.text.slice(0, 70) + '...',
      };
      sessionsRef.current = sessionsRef.current.map((s) =>
        s.id === newSessionId ? updatedSession : s
      );
      setSessions(sessionsRef.current);

      if (currentSessionIdRef.current === newSessionId) {
        const clean = messagesRef.current.filter((m) => !m.isError && m.sessionId === newSessionId);
        const next = clean.some((m) => m.id === userMsg.id)
          ? [...clean, botMsg]
          : [userMsg, botMsg];
        messagesRef.current = next;
        setMessages(next);
      }

      // Persist bot message and updated session header in parallel
      Promise.allSettled([
        saveMessageToStorage(newSessionId, botMsg),
        saveSessionToStorage(updatedSession),
      ]);

      if (shouldAutoGenerateDiagram && resData.diagramPrompt) {
        triggerDiagramGeneration(botMsg.id, resData.diagramPrompt, botMsg);
      }
    } catch (err: any) {
      console.error('Error analyzing scanned image:', err);
      const errorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sessionId: newSessionId,
        sender: 'bot',
        text:
          err?.name === 'TimeoutError'
            ? 'El análisis de la imagen tardó demasiado. Pulsa Reintentar.'
            : 'No pude analizar la imagen. Revisa tu conexión e inténtalo de nuevo.',
        isError: true,
        retryPrompt: data.prompt,
        retryImageBase64: data.imageBase64,
        timestamp: errorTime,
        createdAt: new Date(Math.max(Date.now(), Date.parse(nowIso) + 1)).toISOString(),
      };
      if (currentSessionIdRef.current === newSessionId) {
        const clean = messagesRef.current.filter((m) => !m.isError && m.sessionId === newSessionId);
        const next = clean.some((m) => m.id === userMsg.id)
          ? [...clean, errorMsg]
          : [userMsg, errorMsg];
        messagesRef.current = next;
        setMessages(next);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSubmit = async (prompt: string) => {
    const newSessionId = handleCreateNewSession(`Dictado: ${prompt.slice(0, 24)}...`);
    setActiveTab('chat');
    await handleSendMessage(prompt, undefined, newSessionId, []);
  };

  const handleNewSession = () => {
    selectRequestIdRef.current++;
    setLoadingMessages(false);
    messagesRef.current = [];
    setMessages([]);
    currentSessionIdRef.current = '';
    setCurrentSessionId('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    deleteSessionFromStorage(sessionId).catch(() => {});
    sessionsRef.current = sessionsRef.current.filter((s) => s.id !== sessionId);
    setSessions(sessionsRef.current);
    if (currentSessionIdRef.current === sessionId || currentSessionId === sessionId) {
      selectRequestIdRef.current++;
      setLoadingMessages(false);
      messagesRef.current = [];
      setMessages([]);
      currentSessionIdRef.current = '';
      setCurrentSessionId('');
    }
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFBD9] dark:bg-[#0F1A0F] flex items-center justify-center transition-colors duration-200">
        <div className="w-8 h-8 rounded-full border-2 border-[#941C2F] dark:border-[#FF9FAE] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (authStatus === 'verifyEmail') {
    return (
      <VerifyEmailScreen
        email={currentUser?.email || ''}
        onVerified={handleEmailVerified}
        onSignOut={handleSignOut}
      />
    );
  }

  if (authStatus === 'signedOut') {
    return (
      <LoginScreen
        onGoogle={handleGoogleLogin}
        onGuest={handleGuestLogin}
        isSigningIn={isSigningIn}
        errorMessage={authError}
        onRetry={handleGoogleLogin}
        onBack={hasGuestBackup ? handleBackToGuest : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBD9] dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] flex flex-col selection:bg-[#FDC2B1] dark:selection:bg-[#4A2530] selection:text-[#941C2F] dark:selection:text-[#FF9FAE] transition-colors duration-200">
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
        isDark={isDark}
        onToggleTheme={toggleTheme}
        authStatus={authStatus}
        user={currentUser}
        userVersion={userVersion}
        onSignOut={handleSignOut}
        onSignInFromGuest={handleRequestSignInFromGuest}
      />

      {/* Top Header & Guest Notice Banner */}
      <div className="md:pl-64">
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          authStatus={authStatus}
          user={currentUser}
          userVersion={userVersion}
          onSignOut={handleSignOut}
          onSignInFromGuest={handleRequestSignInFromGuest}
        />

        {/* Discrete guest notice banner */}
        {authStatus === 'guest' && (
          <div className="h-8 bg-[#F5F2C8] dark:bg-[#1A261A] border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 px-3 sm:px-6 flex items-center justify-between text-xs text-[#546C37] dark:text-[#CFE3A8] transition-colors select-none">
            <div className="flex items-center gap-2 mx-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
              {guestLoginError ? (
                <span className="text-[#941C2F] dark:text-[#FF9FAE] font-medium truncate">
                  {guestLoginError}
                </span>
              ) : (
                <span className="font-medium truncate">
                  Modo invitado: tus conversaciones no se guardarán.
                </span>
              )}
            </div>
            {guestLoginError && (
              <button
                type="button"
                onClick={() => setGuestLoginError(null)}
                className="text-[#941C2F] dark:text-[#FF9FAE] hover:opacity-75 text-[10px] font-bold uppercase ml-2 cursor-pointer shrink-0"
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
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
            user={currentUser}
            userVersion={userVersion}
            authStatus={authStatus}
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
            loadingMessages={loadingMessages}
            activeTopic={currentSession?.title || 'Tutoría de Física Aplicada'}
            activeModuleId={currentSession?.moduleId || 'electrostatica'}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRetryDiagram={handleRetryDiagram}
            hasGuestBanner={authStatus === 'guest'}
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

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFBD9]/95 dark:bg-[#0F1A0F]/95 backdrop-blur-md border-t border-[#ADCA88]/50 dark:border-[#3C5A40]/50 px-6 py-2 flex items-center justify-around shadow-lg transition-colors duration-200">
        <button
          onClick={() => setActiveTab('home')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'home' 
              ? 'text-[#941C2F] dark:text-[#FF9FAE] bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 font-bold' 
              : 'text-[#546C37]/70 dark:text-[#CFE3A8]/70'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all relative ${
            activeTab === 'chat' 
              ? 'text-[#941C2F] dark:text-[#FF9FAE] bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 font-bold' 
              : 'text-[#546C37]/70 dark:text-[#CFE3A8]/70'
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
            activeTab === 'simulators' 
              ? 'text-[#941C2F] dark:text-[#FF9FAE] bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 font-bold' 
              : 'text-[#546C37]/70 dark:text-[#CFE3A8]/70'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('formulas')}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'formulas' 
              ? 'text-[#941C2F] dark:text-[#FF9FAE] bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 font-bold' 
              : 'text-[#546C37]/70 dark:text-[#CFE3A8]/70'
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

      {/* Guest to Google Account Migration Confirmation Modal */}
      <ConfirmGuestSignInModal
        isOpen={isConfirmSignInOpen}
        onClose={() => setIsConfirmSignInOpen(false)}
        onConfirm={executeSignInFromGuest}
      />
    </div>
  );
}
