import React from 'react';
import { NewtonMascot } from './NewtonMascot';
import { Compass, MessageSquare, Activity, BookOpen, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'chat' | 'simulators' | 'formulas';
  onSelectTab: (tab: 'home' | 'chat' | 'simulators' | 'formulas') => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenScanner,
  onOpenVoice,
  isDark = false,
  onToggleTheme,
}) => {
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

  return (
    <header className="sticky top-0 z-20 bg-[#FFFBD9]/90 dark:bg-[#0F1A0F]/90 backdrop-blur-md border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 px-3 sm:px-6 py-2.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Left: Mascot & Brand (visible only on mobile md:hidden) */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex md:hidden items-center gap-2.5 cursor-pointer select-none group"
        >
          <NewtonMascot size={36} mood="happy" animated />
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

        {/* Right block: compact theme toggle (especially on mobile) */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
              title={isDark ? 'Modo día' : 'Modo noche'}
              className="md:hidden p-2 rounded-xl bg-white/80 dark:bg-[#16241A]/80 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#6E8F47] cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#FA8989]" />
              ) : (
                <Moon className="w-4 h-4 text-[#546C37]" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
