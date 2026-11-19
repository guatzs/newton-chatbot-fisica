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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-5 border-2 border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              LABORATORIO VIRTUAL INTERACTIVO
            </span>
            <span className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80">Física Aplicada • UCSUR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] mt-1">
            Micro-Simuladores Físicos en Tiempo Real
          </h1>
          <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] mt-0.5">
            Experimenta con simetría electrostática, la ley de Coulomb y la ley de Ohm en tiempo real.
          </p>
        </div>
      </div>

      {/* Simulator Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSim('conductor_gauss')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSim === 'conductor_gauss'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#FA8989]" />
          <span>1. Conductor en Equilibrio (Gauss)</span>
        </button>

        <button
          onClick={() => setActiveSim('coulomb')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSim === 'coulomb'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Magnet className="w-4 h-4 text-[#FA8989]" />
          <span>2. Ley de Coulomb</span>
        </button>

        <button
          onClick={() => setActiveSim('ohm')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSim === 'ohm'
              ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
          }`}
        >
          <Gauge className="w-4 h-4 text-[#FA8989]" />
          <span>3. Ley de Ohm</span>
        </button>
      </div>

      {/* Active Simulator Display */}
      <div className="bg-white dark:bg-[#16241A] rounded-3xl p-5 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm">
        {activeSim === 'conductor_gauss' && (
          <div className="space-y-4">
            <SphericalConductorSim />
            <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans']">
                Fundamento Físico: Ley de Gauss y Conductores
              </h4>
              <p>
                En condiciones electrostáticas, las cargas libres dentro de un conductor experimentan una fuerza F = q·E. Si existiera un campo interior E ≠ 0, los electrones se moverían continuamente generando corriente, contradiciendo el equilibrio. Por tanto, se redistribuyen instantáneamente en la frontera exterior hasta anular el campo interno (E = 0).
              </p>
              <button
                onClick={() => onAskNewton('Explícame en detalle la deducción matemática de por qué el campo dentro de una esfera conductora hueca o sólida es exactamente cero usando la ley de Gauss.')}
                className="mt-2 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Pedir a Newton que deduzca este caso paso a paso
              </button>
            </div>
          </div>
        )}

        {activeSim === 'coulomb' && (
          <div className="space-y-4">
            <CoulombSim />
            <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans']">
                Fundamento Físico: Ley de Coulomb
              </h4>
              <p>
                La fuerza electrostática entre dos cargas puntuales en el vacío es directamente proporcional al producto de las magnitudes de las cargas e inversamente proporcional al cuadrado de la distancia que las separa: F = k·|q₁·q₂| / r², con k = 8.988 × 10⁹ N·m²/C². Cargas del mismo signo se repelen y cargas de signos opuestos se atraen siguiendo un par acción-reacción de igual magnitud.
              </p>
              <button
                onClick={() => onAskNewton('Resuelve paso a paso la fuerza eléctrica entre dos cargas puntuales q1 = 2 µC y q2 = -3 µC separadas 0.5 m en el vacío, indicando si es atractiva o repulsiva.')}
                className="mt-2 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resolver un ejercicio numérico de examen sobre Ley de Coulomb
              </button>
            </div>
          </div>
        )}

        {activeSim === 'ohm' && (
          <div className="space-y-4">
            <OhmSim />
            <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl p-4 text-xs text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans']">
                Fundamento Físico: Ley de Ohm
              </h4>
              <p>
                En un conductor óhmico a temperatura constante, la diferencia de potencial V es directamente proporcional a la intensidad de corriente I que circula por él: V = I · R, donde R es la resistencia eléctrica en ohmios (Ω). La potencia eléctrica disipada por efecto Joule viene dada por P = V · I = I² · R = V² / R en vatios (W).
              </p>
              <button
                onClick={() => onAskNewton('Resuelve paso a paso un circuito con una batería de 6 V conectada a una resistencia de 50 Ω, calculando la corriente eléctrica I y la potencia disipada P.')}
                className="mt-2 text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resolver un ejercicio numérico de examen sobre Ley de Ohm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
