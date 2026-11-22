import React, { useState } from 'react';
import { SphericalConductorSim } from './simulators/SphericalConductorSim';
import { CoulombSim } from './simulators/CoulombSim';
import { OhmSim } from './simulators/OhmSim';
import { Zap, Sparkles, Magnet, Gauge } from 'lucide-react';

interface SimulatorsViewProps {
  initialSimulator?: string;
  onAskNewton: (prompt: string) => void;
}

const VALID_SIMULATORS = ['conductor_gauss', 'coulomb', 'ohm'] as const;
type ActiveSimulator = (typeof VALID_SIMULATORS)[number];

export const SimulatorsView: React.FC<SimulatorsViewProps> = ({
  initialSimulator = 'conductor_gauss',
  onAskNewton,
}) => {
  const defaultSim: ActiveSimulator = VALID_SIMULATORS.includes(initialSimulator as ActiveSimulator)
    ? (initialSimulator as ActiveSimulator)
    : 'conductor_gauss';
  const [activeSim, setActiveSim] = useState<ActiveSimulator>(defaultSim);

  return (
    <div className="w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden px-3 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-8 space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full max-w-full min-w-0 overflow-x-hidden bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-3 sm:p-6 border-2 border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold font-mono">
              LABORATORIO VIRTUAL INTERACTIVO
            </span>
            <span className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80">
              Física Aplicada • UCSUR
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] mt-1.5 leading-tight break-words">
            Micro-Simuladores Físicos en Tiempo Real
          </h1>
          <p className="text-xs sm:text-sm text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] mt-1 break-words">
            Experimenta con simetría electrostática, la ley de Coulomb en 2D y la ley de Ohm en tiempo real.
          </p>
        </div>
      </div>

      {/* Simulator Selector Tabs (responsive full-width on mobile, inline on sm+) */}
      <div className="flex flex-wrap gap-2 w-full min-w-0">
        <button
          type="button"
          onClick={() => setActiveSim('conductor_gauss')}
          aria-pressed={activeSim === 'conductor_gauss'}
          className={`w-full sm:w-auto min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-start sm:justify-center gap-2 text-left transition-all cursor-pointer ${
            activeSim === 'conductor_gauss'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#FA8989] shrink-0" />
          <span className="break-words">1. Conductor en Equilibrio (Gauss)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSim('coulomb')}
          aria-pressed={activeSim === 'coulomb'}
          className={`w-full sm:w-auto min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-start sm:justify-center gap-2 text-left transition-all cursor-pointer ${
            activeSim === 'coulomb'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Magnet className="w-4 h-4 text-[#FA8989] shrink-0" />
          <span className="break-words">2. Ley de Coulomb</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSim('ohm')}
          aria-pressed={activeSim === 'ohm'}
          className={`w-full sm:w-auto min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-start sm:justify-center gap-2 text-left transition-all cursor-pointer ${
            activeSim === 'ohm'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Gauge className="w-4 h-4 text-[#FA8989] shrink-0" />
          <span className="break-words">3. Ley de Ohm</span>
        </button>
      </div>

      {/* Active Simulator Display */}
      <div className="w-full max-w-full min-w-0 overflow-x-hidden bg-white dark:bg-[#16241A] rounded-3xl p-3 sm:p-6 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm">
        {activeSim === 'conductor_gauss' && (
          <div className="space-y-4 min-w-0 w-full">
            <SphericalConductorSim />
            <div className="w-full max-w-full min-w-0 bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-3 sm:p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1.5">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] break-words">
                Fundamento Físico: Ley de Gauss y Conductores
              </h4>
              <p className="leading-relaxed break-words">
                En condiciones electrostáticas, las cargas libres dentro de un conductor experimentan una fuerza F = q·E. Si existiera un campo interior E ≠ 0, los electrones se moverían continuamente generando corriente, contradiciendo el equilibrio. Por tanto, se redistribuyen instantáneamente en la frontera exterior hasta anular el campo interno (E = 0).
              </p>
              <button
                type="button"
                onClick={() => onAskNewton('Explícame en detalle la deducción matemática de por qué el campo dentro de una esfera conductora hueca o sólida es exactamente cero usando la ley de Gauss.')}
                className="mt-1 min-h-[40px] py-1.5 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1.5 text-left cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Pedir a Newton que deduzca este caso paso a paso</span>
              </button>
            </div>
          </div>
        )}

        {activeSim === 'coulomb' && (
          <div className="space-y-4 min-w-0 w-full">
            <CoulombSim />
            <div className="w-full max-w-full min-w-0 bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-3 sm:p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1.5">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] break-words">
                Fundamento Físico: Ley de Coulomb y Principio de Superposición en 2D
              </h4>
              <p className="leading-relaxed break-words">
                Cuando actúan múltiples cargas puntuales sobre una carga objetivo q_obj, la fuerza eléctrica neta es la suma vectorial de las fuerzas individuales que ejerce cada carga: F⃗_neta = Σ F⃗_i = Σ [k·(q_i·q_obj / r_i²)·û_i], con k = 9 × 10⁹ N·m²/C². Puedes descomponer cada fuerza en sus componentes F_x y F_y para hallar la magnitud resultante |F⃗_neta| = √(F_x² + F_y²) y su ángulo θ.
              </p>
              <button
                type="button"
                onClick={() => onAskNewton('Resuelve paso a paso un ejercicio 2D de principio de superposición con 3 cargas puntuales en el plano cartesiano usando k = 9 × 10⁹ N·m²/C², hallando Fx, Fy, magnitud total y ángulo.')}
                className="mt-1 min-h-[40px] py-1.5 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1.5 text-left cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Resolver un ejercicio 2D de superposición con Newton</span>
              </button>
            </div>
          </div>
        )}

        {activeSim === 'ohm' && (
          <div className="space-y-4 min-w-0 w-full">
            <OhmSim />
            <div className="w-full max-w-full min-w-0 bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-3 sm:p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1.5">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] break-words">
                Fundamento Físico: Ley de Ohm y Circuitos Serie, Paralelo y Mixto
              </h4>
              <p className="leading-relaxed break-words">
                En circuitos de corriente continua se combinan la Ley de Ohm (V = I · R) y las Leyes de Kirchhoff: en serie las resistencias se suman (R_eq = Σ Rᵢ) y comparten la misma corriente I; en paralelo comparten el mismo voltaje V y sus inversos se suman (1/R_eq = Σ 1/Rᵢ); en un circuito mixto (R₁ + R₂ ∥ R₃) se reduce primero el bloque paralelo R₂₃ y luego se suma en serie con R₁. La potencia total disipada cumple P = V · I_total = Σ Pᵢ.
              </p>
              <button
                type="button"
                onClick={() => onAskNewton('Resuelve paso a paso un circuito mixto tipo examen con una fuente de 12 V conectada a R1 = 4 Ω en serie con dos resistencias en paralelo R2 = 6 Ω y R3 = 3 Ω, calculando Req, Itotal, voltajes y corrientes en cada resistencia.')}
                className="mt-1 min-h-[40px] py-1.5 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1.5 text-left cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Resolver un ejercicio tipo examen de circuito mixto con Newton</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
