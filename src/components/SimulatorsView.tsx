import React, { useState } from 'react';
import { SphericalConductorSim } from './simulators/SphericalConductorSim';
import { RcCircuitSim } from './simulators/RcCircuitSim';
import { DiodeIvSim } from './simulators/DiodeIvSim';
import { Zap, Activity, Cpu, Sparkles } from 'lucide-react';

interface SimulatorsViewProps {
  initialSimulator?: string;
  onAskNewton: (prompt: string) => void;
}

export const SimulatorsView: React.FC<SimulatorsViewProps> = ({
  initialSimulator = 'conductor_gauss',
  onAskNewton,
}) => {
  const [activeSim, setActiveSim] = useState<'conductor_gauss' | 'circuito_rc' | 'diodo_iv'>(
    (initialSimulator as any) || 'conductor_gauss'
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#FFFBD9] rounded-3xl p-5 border-2 border-[#ADCA88]/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#D6E3B1] text-[#546C37] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              LABORATORIO VIRTUAL INTERACTIVO
            </span>
            <span className="text-xs text-[#546C37]/80">Física Aplicada • UCSUR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#546C37] font-['Pixelify_Sans'] mt-1">
            Micro-Simuladores Físicos en Tiempo Real
          </h1>
          <p className="text-xs text-[#546C37]/80 font-['Space_Grotesk'] mt-0.5">
            Experimenta con parámetros de simetría electrostática, constantes de tiempo en circuitos y curvas semiconductoras.
          </p>
        </div>
      </div>

      {/* Simulator Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSim('conductor_gauss')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeSim === 'conductor_gauss'
              ? 'bg-[#546C37] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 text-[#546C37] hover:bg-[#D6E3B1]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#FA8989]" />
          <span>1. Conductor en Equilibrio (Gauss)</span>
        </button>

        <button
          onClick={() => setActiveSim('circuito_rc')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeSim === 'circuito_rc'
              ? 'bg-[#546C37] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 text-[#546C37] hover:bg-[#D6E3B1]'
          }`}
        >
          <Activity className="w-4 h-4 text-[#FA8989]" />
          <span>2. Circuito RC Transitorio</span>
        </button>

        <button
          onClick={() => setActiveSim('diodo_iv')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeSim === 'diodo_iv'
              ? 'bg-[#546C37] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 text-[#546C37] hover:bg-[#D6E3B1]'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#FA8989]" />
          <span>3. Diodo Shockley & Rectificación</span>
        </button>
      </div>

      {/* Active Simulator Display */}
      <div className="bg-white rounded-3xl p-5 border border-[#ADCA88]/50 shadow-sm">
        {activeSim === 'conductor_gauss' && (
          <div className="space-y-4">
            <SphericalConductorSim />
            <div className="bg-[#FFFBD9] rounded-2xl p-4 text-xs text-[#546C37] border border-[#ADCA88]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] font-['Pixelify_Sans']">
                Fundamento Físico: Ley de Gauss y Conductores
              </h4>
              <p>
                En condiciones electrostáticas, las cargas libres dentro de un conductor experimentan una fuerza F = q·E. Si existiera un campo interior E ≠ 0, los electrones se moverían continuamente generando corriente, contradiciendo el equilibrio. Por tanto, se redistribuyen instantáneamente en la frontera exterior hasta anular el campo interno (E = 0).
              </p>
              <button
                onClick={() => onAskNewton('Explícame en detalle la deducción matemática de por qué el campo dentro de una esfera conductora hueca o sólida es exactamente cero usando la ley de Gauss.')}
                className="mt-2 text-xs font-bold text-[#941C2F] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Pedir a Newton que deduzca este caso paso a paso
              </button>
            </div>
          </div>
        )}

        {activeSim === 'circuito_rc' && (
          <div className="space-y-4">
            <RcCircuitSim />
            <div className="bg-[#FFFBD9] rounded-2xl p-4 text-xs text-[#546C37] border border-[#ADCA88]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] font-['Pixelify_Sans']">
                Fundamento Físico: Ecuación Diferencial del Circuito RC
              </h4>
              <p>
                Aplicando la ley de tensiones de Kirchhoff (KVL): ε - i(t)R - q(t)/C = 0. Como i = dq/dt, se obtiene la ecuación diferencial cuya solución es q(t) = Cε(1 - e^(-t/τ)) con constante de tiempo τ = RC. Al transcurrir t = τ, la tensión en el condensador alcanza el 63.2% de la tensión de la fuente.
              </p>
              <button
                onClick={() => onAskNewton('Resuelve un ejercicio de examen con un circuito RC donde R = 20kΩ, C = 47µF y fuente de 15V, calculando el tiempo para llegar al 90% de la carga máxima.')}
                className="mt-2 text-xs font-bold text-[#941C2F] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resolver un ejercicio numérico de examen sobre este circuito RC
              </button>
            </div>
          </div>
        )}

        {activeSim === 'diodo_iv' && (
          <div className="space-y-4">
            <DiodeIvSim />
            <div className="bg-[#FFFBD9] rounded-2xl p-4 text-xs text-[#546C37] border border-[#ADCA88]/40 space-y-1">
              <h4 className="font-bold text-sm text-[#941C2F] font-['Pixelify_Sans']">
                Fundamento Físico: Unión P-N y Rectificación
              </h4>
              <p>
                La unión semiconductora P-N presenta una barrera de potencial de contacto (aproximadamente 0.7 V en Silicio a temperatura ambiente). En polarización directa por encima de V_γ, la corriente crece exponencialmente según Shockley. Al conectar una señal alterna senoidal, el diodo conduce solo en el semiciclo positivo. Con un condensador en paralelo a la carga, el rizado ΔV_r disminuye según ΔV_r = I_dc / (f·C).
              </p>
              <button
                onClick={() => onAskNewton('Explícame cómo se calcula el condensador de filtrado necesario para que un rectificador de onda completa de 60Hz tenga un factor de rizado menor al 5%.')}
                className="mt-2 text-xs font-bold text-[#941C2F] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Consultar el cálculo del capacitor de filtrado con Newton
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
