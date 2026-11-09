import React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { NewtonMascot } from './NewtonMascot';
import { COURSE_MODULES, PHYSICAL_CONSTANTS } from '../data/syllabus';
import { CourseModuleId, ChatSession } from '../types';
import { 
  Camera, 
  Mic, 
  Play, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Activity, 
  CheckCircle2, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

interface HomeViewProps {
  onStartChatWithPrompt: (prompt: string, moduleId?: CourseModuleId) => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  onOpenSimulator: (simType?: string) => void;
  onOpenFormulas: () => void;
  recentSessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
  user?: FirebaseUser | null;
  authStatus?: 'guest' | 'google' | 'loading' | 'signedOut';
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartChatWithPrompt,
  onOpenScanner,
  onOpenVoice,
  onOpenSimulator,
  onOpenFormulas,
  recentSessions,
  onSelectSession,
  user = null,
  authStatus = 'guest',
}) => {
  const [quickInput, setQuickInput] = React.useState('');
  const [curiousFactIndex, setCuriousFactIndex] = React.useState(0);

  const getGreeting = () => {
    if (authStatus === 'google' && user?.displayName) {
      const firstName = user.displayName.trim().split(/\s+/)[0];
      if (firstName) return `¡Hola, ${firstName}!`;
    }
    return '¡Hola!';
  };

  const curiousFacts = [
    'La constante de Coulomb k ≈ 8.99 × 10⁹ N·m²/C² equivale a 1 / (4πε₀).',
    'En un conductor en equilibrio electrostático, todo el exceso de carga reside exclusivamente en la superficie externa.',
    'La constante de tiempo τ = RC indica el tiempo necesario para que un condensador alcance el 63.2% de su carga máxima.',
    'El diodo Zener funciona en polarización inversa aprovechando el efecto de ruptura controlada para estabilizar tensiones.',
    'La ley de Lenz es una manifestación directa de la conservación de la energía en la inducción electromagnética.',
  ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onStartChatWithPrompt(quickInput.trim());
    setQuickInput('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* 1. Student Greeting & Mascot Hero Banner (matching MovilHome.png & DesktopInicio.png) */}
      <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-5 sm:p-6 border-2 border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 transition-colors duration-200">
        <div className="space-y-2 z-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase font-mono">
            FÍSICA UNIVERSITARIA • UCSUR
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-[#546C37]/80 dark:text-[#CFE3A8]/80 max-w-md font-['Space_Grotesk'] leading-relaxed">
            Soy tu tutor de Física Aplicada. Estoy listo para ayudarte con Electrostática, Electrodinámica, Magnetismo y Electrónica.
          </p>
        </div>

        <div className="relative shrink-0 flex flex-col items-center">
          <NewtonMascot size={110} mood="happy" animated />
          <span className="mt-1 text-[11px] font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] tracking-wide">
            Newton AI v2.4
          </span>
        </div>
      </div>

      {/* 2. Instant Input Bar with Camera & Mic Buttons (matching DesktopInicio.png) */}
      <form
        onSubmit={handleQuickSubmit}
        className="bg-white dark:bg-[#16241A] rounded-3xl p-2 sm:p-2.5 border-2 border-[#ADCA88] dark:border-[#3C5A40] shadow-md flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-[#546C37] dark:focus-within:ring-[#6E8F47]"
      >
        <button
          type="button"
          onClick={onOpenScanner}
          title="Adjuntar o escanear ejercicio"
          className="p-2 sm:p-2.5 rounded-2xl bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] text-[#546C37] dark:text-[#CFE3A8] transition-all cursor-pointer"
        >
          <Camera className="w-5 h-5 text-[#546C37] dark:text-[#CFE3A8]" />
        </button>
        <button
          type="button"
          onClick={onOpenVoice}
          title="Dictar duda por voz"
          className="p-2 sm:p-2.5 rounded-2xl bg-[#FDC2B1]/50 dark:bg-[#4A2530]/50 hover:bg-[#FDC2B1] dark:hover:bg-[#4A2530] text-[#941C2F] dark:text-[#FF9FAE] transition-all cursor-pointer"
        >
          <Mic className="w-5 h-5 text-[#941C2F] dark:text-[#FF9FAE]" />
        </button>

        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Pregúntale a Newton sobre electrostática, circuitos o magnetismo..."
          className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-[#546C37] dark:text-[#CFE3A8] placeholder-[#546C37]/50 dark:placeholder-[#CFE3A8]/50 focus:outline-none font-['Space_Grotesk']"
        />

        <button
          type="submit"
          className="py-2.5 px-4 bg-[#FA8989] hover:bg-[#FA8989]/90 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Consultar</span>
        </button>
      </form>

      {/* Suggested Quick Prompt Chips (matching mockup) */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          '# ¿Cómo funciona la Ley de Gauss?',
          '# Calcula la fuerza entre dos cargas',
          '# Explícame el campo eléctrico en un conductor',
          '# Circuito transitorio RC',
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onStartChatWithPrompt(chip.replace('# ', ''))}
            className="bg-[#D6E3B1]/70 dark:bg-[#24402B]/70 hover:bg-[#D6E3B1] dark:hover:bg-[#2F5237] text-[#546C37] dark:text-[#CFE3A8] font-medium px-3 py-1.5 rounded-full transition-all border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-[11px] sm:text-xs cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 4. Active Course Banner ("EN CURSO • NÚCLEO FÍSICA II" matching MovilHome.png) */}
      <div className="bg-[#D6E3B1]/80 dark:bg-[#24402B]/80 rounded-3xl p-5 border-2 border-[#ADCA88] dark:border-[#3C5A40] shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-bold text-[#546C37] dark:text-[#CFE3A8] text-[11px] uppercase tracking-wider font-mono">
            <span className="w-2 h-2 rounded-full bg-[#941C2F] dark:bg-[#C0334A] animate-pulse"></span>
            EN CURSO • NÚCLEO FÍSICA APLICADA
          </div>
          <BookOpen className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk']">
          02. Ley de Gauss en Conductores
        </h3>
        <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 mt-0.5">
          Superficies gaussianas cerradas & simetría esférica y cilíndrica.
        </p>

        <div className="mt-4 flex items-center justify-between pt-1">
          <span className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-medium">
            Módulo destacado para práctica conceptual
          </span>
          <button
            onClick={() => onOpenSimulator('conductor_gauss')}
            className="py-1.5 px-4 bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#546C37]/90 dark:hover:bg-[#6E8F47]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span>Ver Simulador</span>
            <Play className="w-3 h-3 fill-white" />
          </button>
        </div>
      </div>

      {/* 5. Syllabus 4 Modules Section ("¿Qué exploramos hoy?" matching MovilHome.png) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans']">
            ¿Qué exploramos hoy?
          </h2>
          <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] font-mono bg-[#D6E3B1] dark:bg-[#24402B] px-2.5 py-0.5 rounded-full">
            4 Módulos Oficiales
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COURSE_MODULES.map((mod) => (
            <div
              key={mod.id}
              onClick={() => onStartChatWithPrompt(`Hola Newton, quiero practicar el tema de ${mod.title}. ¿Cuáles son los conceptos clave y problemas típicos del sílabo?`, mod.id)}
              className="bg-white dark:bg-[#16241A] rounded-3xl p-4 sm:p-5 border-2 border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:border-[#546C37] dark:hover:border-[#6E8F47] transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8]">
                    {mod.badge}
                  </span>
                  <span className="text-[11px] text-[#546C37]/70 dark:text-[#CFE3A8]/70 font-mono">
                    {mod.weeks}
                  </span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-[#546C37] dark:text-[#CFE3A8] group-hover:text-[#941C2F] dark:group-hover:text-[#FF9FAE] transition-colors font-['Pixelify_Sans']">
                  {mod.title}
                </h3>
                <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 mt-1 line-clamp-2 font-['Space_Grotesk']">
                  {mod.subtitle}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#ADCA88]/20 dark:border-[#3C5A40]/20 text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                <span>{mod.exercisesCount} Prácticas guiadas</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[#941C2F] dark:text-[#FF9FAE]">
                  Consultar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Quick Tool Access Grid (matching DesktopInicio.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={onOpenFormulas}
          className="bg-white dark:bg-[#16241A] rounded-3xl p-4 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:border-[#546C37] dark:hover:border-[#6E8F47] cursor-pointer shadow-xs hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FDC2B1]/50 dark:bg-[#4A2530]/50 text-[#941C2F] dark:text-[#FF9FAE] flex items-center justify-center font-bold text-sm mb-2">
            Σ
          </div>
          <h4 className="font-bold text-sm text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans']">
            Explorar Fórmulas
          </h4>
          <p className="text-xs text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
            Ecuaciones de Gauss, Ampère, Ohm, Biot-Savart y Shockley.
          </p>
        </div>

        <div
          onClick={() => onOpenSimulator()}
          className="bg-white dark:bg-[#16241A] rounded-3xl p-4 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:border-[#546C37] dark:hover:border-[#6E8F47] cursor-pointer shadow-xs hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] flex items-center justify-center font-bold text-sm mb-2">
            ⚡
          </div>
          <h4 className="font-bold text-sm text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans']">
            Micro-Simuladores
          </h4>
          <p className="text-xs text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
            Líneas de campo, circuitos RC transitorios y diodos en 2D interactivo.
          </p>
        </div>

        <div
          onClick={() => onStartChatWithPrompt('¿Cuáles son los ejercicios tipo examen más comunes de Física Aplicada?')}
          className="bg-white dark:bg-[#16241A] rounded-3xl p-4 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:border-[#546C37] dark:hover:border-[#6E8F47] cursor-pointer shadow-xs hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88] dark:border-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] flex items-center justify-center font-bold text-sm mb-2">
            📝
          </div>
          <h4 className="font-bold text-sm text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans']">
            Banco de Exámenes
          </h4>
          <p className="text-xs text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
            Evaluación Continua 1, Parcial, Continua 2 y Final de la UCSUR.
          </p>
        </div>
      </div>

      {/* 7. Consultas Recientes (Saved Sessions matching MovilHome.png) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
            Consultas recientes
          </h3>
          <span className="text-xs text-[#941C2F] dark:text-[#FF9FAE] font-bold">
            {recentSessions.length} guardadas
          </span>
        </div>

        {recentSessions.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#16241A]/60 rounded-2xl p-4 text-center border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 text-xs text-[#546C37]/70 dark:text-[#CFE3A8]/70">
            Aún no tienes consultas guardadas. ¡Hazle tu primera pregunta a Newton!
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className="bg-white/90 dark:bg-[#16241A]/90 hover:bg-white dark:hover:bg-[#16241A] rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 cursor-pointer shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#546C37] dark:bg-[#6E8F47]"></span>
                    <h4 className="font-bold text-xs text-[#546C37] dark:text-[#CFE3A8] truncate font-['Space_Grotesk']">
                      {s.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#546C37]/70 dark:text-[#CFE3A8]/70 truncate mt-0.5">
                    {s.lastMessage || s.topic}
                  </p>
                </div>
                <span className="text-[10px] bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2 py-0.5 rounded-full font-mono shrink-0">
                  {s.messageCount} msgs
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Dato del Día / Constante del día (matching MovilHome.png & DesktopInicio.png) */}
      <div className="bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 rounded-3xl p-4 border border-[#ADCA88] dark:border-[#3C5A40] flex items-center justify-between gap-3 transition-colors duration-200">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">💡</span>
          <div>
            <div className="text-[10px] font-bold text-[#941C2F] dark:text-[#FF9FAE] uppercase tracking-wider font-mono">
              ¿DATO CURIOSO / CONSTANTE FÍSICA?
            </div>
            <p className="text-xs text-[#546C37] dark:text-[#CFE3A8] font-medium mt-0.5">
              {curiousFacts[curiousFactIndex]}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCuriousFactIndex((prev) => (prev + 1) % curiousFacts.length)}
          className="p-2 rounded-full hover:bg-white/70 dark:hover:bg-[#16241A]/70 text-[#546C37] dark:text-[#CFE3A8] transition-colors shrink-0 cursor-pointer"
          title="Otro dato curioso"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Footer footer info */}
      <footer className="pt-2 pb-6 text-center text-[10px] text-[#546C37]/60 dark:text-[#CFE3A8]/60 font-mono">
        Newton AI v2.4 • Física Aplicada (815972) • Universidad Científica del Sur
      </footer>
    </div>
  );
};
