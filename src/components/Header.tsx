import React from 'react';
import { NewtonMascot } from './NewtonMascot';
import { Camera, Mic, Compass, MessageSquare, Activity, BookOpen, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'chat' | 'simulators' | 'formulas';
  onSelectTab: (tab: 'home' | 'chat' | 'simulators' | 'formulas') => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenScanner,
  onOpenVoice,
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
    <header className="sticky top-0 z-20 bg-[#FFFBD9]/90 backdrop-blur-md border-b border-[#ADCA88]/40 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Left: Mascot & Brand (visible only on mobile md:hidden) */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex md:hidden items-center gap-2.5 cursor-pointer select-none group"
        >
          <NewtonMascot size={36} mood="happy" animated />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-['Pixelify_Sans'] text-lg font-bold text-[#546C37] tracking-tight group-hover:text-[#941C2F] transition-colors">
                Newton AI
              </span>
              <span className="text-[10px] bg-[#D6E3B1] text-[#546C37] px-2 py-0.5 rounded-full font-bold">
                UCSUR
              </span>
            </div>
            <p className="text-[10px] text-[#546C37]/80 font-['Space_Grotesk'] leading-none">
              Física Aplicada • 2026-I
            </p>
          </div>
        </div>

        {/* Desktop Left: Breadcrumb / Active Context Header */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#D6E3B1]/70 border border-[#ADCA88]/60 flex items-center justify-center text-[#546C37]">
            <IconComponent className="w-4 h-4 text-[#546C37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#546C37]/70 uppercase tracking-wider">
                {current.section}
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs font-bold text-[#546C37] font-['Space_Grotesk']">
                {current.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Status */}
        <div className="flex items-center gap-2">
          {/* Quick scanner button */}
          <button
            onClick={onOpenScanner}
            title="Escanear ejercicio con cámara"
            className="p-2 rounded-xl bg-white/80 hover:bg-[#D6E3B1] border border-[#ADCA88]/50 text-[#546C37] transition-all shadow-2xs active:scale-95 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#546C37]" />
            <span className="hidden sm:inline">Escanear</span>
          </button>

          {/* Quick Voice button */}
          <button
            onClick={onOpenVoice}
            title="Dictar duda por voz"
            className="p-2 rounded-xl bg-[#FA8989]/20 hover:bg-[#FA8989]/40 border border-[#FA8989]/50 text-[#941C2F] transition-all shadow-2xs active:scale-95 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Mic className="w-4 h-4 text-[#941C2F]" />
            <span className="hidden sm:inline">Voz</span>
          </button>

          {/* Online indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#D6E3B1]/50 border border-[#ADCA88]/40 text-[11px] font-mono font-bold text-[#546C37]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>En línea</span>
          </div>
        </div>
      </div>
    </header>
  );
};
