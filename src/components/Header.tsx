import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { 
  Compass, 
  MessageSquare, 
  Activity, 
  BookOpen, 
  Sun, 
  Moon, 
  Camera, 
  Mic, 
  LogOut 
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'chat' | 'simulators' | 'formulas';
  onSelectTab: (tab: 'home' | 'chat' | 'simulators' | 'formulas') => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  authStatus?: 'guest' | 'google' | 'loading' | 'signedOut';
  user?: User | null;
  onSignOut?: () => void;
  onSignInFromGuest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenScanner,
  onOpenVoice,
  isDark = false,
  onToggleTheme,
  authStatus = 'guest',
  user = null,
  onSignOut,
  onSignInFromGuest,
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const getTabLabel = () => {
    switch (activeTab) {
      case 'home':
        return { section: 'Descubrir', title: 'Inicio / Novedades del Sílabo', icon: Compass };
      case 'chat':
        return { section: 'Espacio de Trabajo', title: 'Tutoría Newton AI', icon: MessageSquare };
      case 'simulators':
        return { section: 'Herramientas', title: 'Laboratorio de Simulaciones', icon: Activity };
      case 'formulas':
        return { section: 'Herramientas', title: 'Formulario de Leyes y Principios', icon: BookOpen };
    }
  };

  const current = getTabLabel();
  const IconComponent = current.icon;

  const initial = user?.displayName
    ? user.displayName.trim().charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <header className="sticky top-0 z-20 bg-[#FFFBD9]/90 dark:bg-[#0F1A0F]/90 backdrop-blur-md border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 px-3 sm:px-6 py-2.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Left: Mascot & Brand (visible only on mobile md:hidden) */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex md:hidden items-center gap-2.5 cursor-pointer select-none group"
        >
          <img
            src="/newton-mascot.png"
            alt="Newton AI"
            className="w-9 h-9 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-['Pixelify_Sans'] text-lg font-bold text-[#546C37] dark:text-[#CFE3A8] tracking-tight group-hover:text-[#941C2F] dark:group-hover:text-[#FF9FAE] transition-colors">
                Newton AI
              </span>
              <span className="text-[10px] bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2 py-0.5 rounded-full font-bold">
                UCSUR
              </span>
            </div>
            <p className="text-[10px] text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] leading-none">
              Física Aplicada • 2026-I
            </p>
          </div>
        </div>

        {/* Desktop Left: Breadcrumb / Active Context Header */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#D6E3B1]/70 dark:bg-[#24402B]/70 border border-[#ADCA88]/60 dark:border-[#3C5A40]/60 flex items-center justify-center text-[#546C37] dark:text-[#CFE3A8]">
            <IconComponent className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#546C37]/70 dark:text-[#CFE3A8]/70 uppercase tracking-wider">
                {current.section}
              </span>
              <span className="text-stone-400 dark:text-stone-500 text-xs">•</span>
              <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk']">
                {current.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right block: Escanear, Voz, Theme toggle & Auth Profile Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scanner action shortcut */}
          <button
            type="button"
            onClick={onOpenScanner}
            title="Escanear ejercicio con cámara"
            aria-label="Escanear ejercicio"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/80 dark:bg-[#16241A]/80 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] transition-all flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Escanear</span>
          </button>

          {/* Voice dictation action shortcut */}
          <button
            type="button"
            onClick={onOpenVoice}
            title="Dictar ejercicio por voz"
            aria-label="Dictar por voz"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/80 dark:bg-[#16241A]/80 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] transition-all flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Voz</span>
          </button>

          {/* Mobile Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
              title={isDark ? 'Modo día' : 'Modo noche'}
              className="md:hidden p-1.5 rounded-xl bg-white/80 dark:bg-[#16241A]/80 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] transition-all shadow-2xs cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-[#FA8989]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#546C37]" />
              )}
            </button>
          )}

          {/* Auth Session Controls */}
          {authStatus === 'google' && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-[#ADCA88]/40 dark:border-[#3C5A40]/40">
              {user.photoURL && !avatarError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-7 h-7 rounded-full object-cover border border-[#ADCA88] dark:border-[#3C5A40] shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-[#FFFBD9] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {initial}
                </div>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#FA8989]/20 hover:text-[#941C2F] dark:hover:text-[#FF9FAE] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center pl-1 sm:pl-2 border-l border-[#ADCA88]/40 dark:border-[#3C5A40]/40">
              {onSignInFromGuest && (
                <button
                  type="button"
                  onClick={onSignInFromGuest}
                  title="Iniciar sesión con Google"
                  aria-label="Iniciar sesión con Google"
                  className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border border-[#546C37]/60 dark:border-[#CFE3A8]/60 bg-[#ADCA88]/15 dark:bg-[#ADCA88]/10 hover:bg-[#ADCA88]/30 dark:hover:bg-[#ADCA88]/20 text-[#546C37] dark:text-[#CFE3A8] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.18 3.66-9.15z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
