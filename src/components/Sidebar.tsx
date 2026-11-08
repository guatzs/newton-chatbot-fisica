import React, { useState } from 'react';
import { NewtonMascot } from './NewtonMascot';
import { ChatSession, CourseModuleId } from '../types';
import { 
  Compass, 
  MessageSquare, 
  Plus, 
  Activity, 
  BookOpen, 
  Trash2, 
  Check, 
  X, 
  ShieldCheck, 
  User, 
  Cpu, 
  Layers,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'chat' | 'simulators' | 'formulas';
  onSelectTab: (tab: 'home' | 'chat' | 'simulators' | 'formulas') => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isDark = false,
  onToggleTheme,
}) => {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const confirmDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (onDeleteSession) {
      await onDeleteSession(sessionId);
    }
    setSessionToDelete(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(null);
  };

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#FFFBD9] dark:bg-[#0F1A0F] border-r border-[#ADCA88]/60 dark:border-[#3C5A40]/60 z-30 shadow-xs select-none transition-colors duration-200">
      {/* Top Brand & Mascot */}
      <div 
        onClick={() => onSelectTab('home')}
        className="p-4 border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 flex items-center gap-3 cursor-pointer hover:bg-[#D6E3B1]/20 dark:hover:bg-[#24402B]/30 transition-colors shrink-0"
      >
        <NewtonMascot size={42} mood="happy" animated />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-['Pixelify_Sans'] text-xl font-bold text-[#546C37] dark:text-[#CFE3A8] tracking-tight">
              Newton AI
            </span>
            <span className="text-[9px] bg-[#941C2F] dark:bg-[#C0334A] text-white px-1.5 py-0.5 rounded-full font-bold">
              UCSUR
            </span>
          </div>
          <p className="text-[10px] text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] truncate">
            Física Aplicada • 2026-I
          </p>
        </div>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* 1. SECCIÓN: DESCUBRIR */}
        <div>
          <span className="text-[10px] font-mono font-bold text-[#546C37]/60 dark:text-[#CFE3A8]/60 tracking-wider px-2 uppercase block mb-1">
            Descubrir
          </span>
          <button
            onClick={() => onSelectTab('home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
            }`}
          >
            <Compass className={`w-4 h-4 ${activeTab === 'home' ? 'text-[#FA8989]' : 'text-[#546C37] dark:text-[#CFE3A8]'}`} />
            <span className="font-['Space_Grotesk']">Inicio / Descubrir</span>
          </button>
        </div>

        {/* 2. SECCIÓN: ESPACIO DE TRABAJO */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-[#546C37]/60 dark:text-[#CFE3A8]/60 tracking-wider uppercase">
              Espacio de trabajo
            </span>
            <button
              onClick={onNewSession}
              title="Nueva Consulta"
              className="p-1 rounded-lg bg-[#FA8989] hover:bg-[#FA8989]/90 text-white transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          <button
            onClick={() => onSelectTab('chat')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all mb-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'chat' ? 'text-[#FA8989]' : 'text-[#546C37] dark:text-[#CFE3A8]'}`} />
              <span className="font-['Space_Grotesk'] truncate">Chat con Newton</span>
            </div>
            {sessions.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'chat' 
                  ? 'bg-[#941C2F] dark:bg-[#C0334A] text-white' 
                  : 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8]'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>

          {/* List of Previous Conversations */}
          <div className="space-y-1 pl-2 border-l-2 border-[#ADCA88]/40 dark:border-[#3C5A40]/40 ml-2">
            {sessions.length === 0 ? (
              <p className="text-[11px] text-[#546C37]/60 dark:text-[#CFE3A8]/60 italic py-1 px-1 font-['Space_Grotesk']">
                Sin conversaciones aún
              </p>
            ) : (
              sessions.slice(0, 7).map((s) => {
                const isActive = activeTab === 'chat' && s.id === currentSessionId;
                const isConfirming = sessionToDelete === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => onSelectSession(s.id)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer font-['Space_Grotesk'] ${
                      isActive
                        ? 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#3D121A] dark:text-[#FBE9E4] font-bold shadow-2xs'
                        : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/40 dark:hover:bg-[#24402B]/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="truncate leading-tight">
                        {s.title || 'Consulta de física'}
                      </p>
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 shrink-0 animate-in fade-in">
                        <button
                          onClick={(e) => confirmDelete(e, s.id)}
                          title="Confirmar eliminación"
                          className="p-1 rounded bg-[#941C2F] dark:bg-[#C0334A] text-white hover:bg-red-800 transition-colors"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={cancelDelete}
                          title="Cancelar"
                          className="p-1 rounded bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-400 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      onDeleteSession && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(s.id);
                          }}
                          title="Eliminar conversación"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FA8989]/30 text-[#941C2F] dark:text-[#FF9FAE] transition-opacity shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. SECCIÓN: HERRAMIENTAS */}
        <div>
          <span className="text-[10px] font-mono font-bold text-[#546C37]/60 dark:text-[#CFE3A8]/60 tracking-wider px-2 uppercase block mb-1">
            Herramientas
          </span>
          <div className="space-y-1">
            <button
              onClick={() => onSelectTab('simulators')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'simulators'
                  ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                  : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeTab === 'simulators' ? 'text-[#FA8989]' : 'text-[#546C37] dark:text-[#CFE3A8]'}`} />
              <span className="font-['Space_Grotesk']">Simuladores (Lab)</span>
            </button>

            <button
              onClick={() => onSelectTab('formulas')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'formulas'
                  ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                  : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'formulas' ? 'text-[#FA8989]' : 'text-[#546C37] dark:text-[#CFE3A8]'}`} />
              <span className="font-['Space_Grotesk']">Formulario Sílabo</span>
            </button>
          </div>
        </div>

        {/* 4. SECCIÓN: SISTEMA */}
        <div>
          <span className="text-[10px] font-mono font-bold text-[#546C37]/60 dark:text-[#CFE3A8]/60 tracking-wider px-2 uppercase block mb-1">
            Sistema
          </span>

          {/* Theme Switch Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Cambiar entre modo día y modo noche"
              onClick={onToggleTheme}
              className="w-full mb-2 flex items-center justify-between p-2 rounded-2xl bg-white/80 dark:bg-[#16241A]/80 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 hover:bg-[#D6E3B1]/40 dark:hover:bg-[#2F5237]/40 text-[#546C37] dark:text-[#CFE3A8] text-xs font-semibold transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#6E8F47] cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Moon className="w-4 h-4 text-[#FF9FAE]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#FA8989]" />
                )}
                <span className="font-['Space_Grotesk']">
                  {isDark ? 'Modo noche' : 'Modo día'}
                </span>
              </div>
              <div className="w-8 h-4 rounded-full bg-[#D6E3B1] dark:bg-[#24402B] p-0.5 flex items-center transition-colors">
                <div
                  className={`w-3 h-3 rounded-full bg-[#546C37] dark:bg-[#6E8F47] shadow-xs transform transition-transform motion-reduce:transition-none ${
                    isDark ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          )}

          <div className="p-2.5 bg-white/70 dark:bg-[#16241A]/70 rounded-2xl border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 space-y-1.5 text-[11px] font-['Space_Grotesk']">
            <div className="flex items-center text-[#546C37] dark:text-[#CFE3A8]">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-[#546C37] dark:text-[#CFE3A8]" />
                Física Aplicada
              </span>
            </div>
            <div className="flex items-center justify-between text-[#546C37]/80 dark:text-[#CFE3A8]/80 text-[10px]">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#546C37] dark:text-[#CFE3A8]" />
                Sílabo oficial
              </span>
              <span>4 Módulos</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
              <span>Motor Físico Conectado</span>
            </div>
          </div>
        </div>

        {/* 5. SECCIÓN: PERFIL */}
        <div>
          <span className="text-[10px] font-mono font-bold text-[#546C37]/60 dark:text-[#CFE3A8]/60 tracking-wider px-2 uppercase block mb-1">
            Perfil
          </span>
          <div className="p-2.5 bg-[#D6E3B1]/40 dark:bg-[#24402B]/40 rounded-2xl border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] truncate font-['Space_Grotesk']">
                Estudiante UCSUR
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#546C37]/75 dark:text-[#CFE3A8]/75">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">Sesión Segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
