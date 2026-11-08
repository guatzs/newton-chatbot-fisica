import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

export const DiodeIvSim: React.FC = () => {
  const [diodeType, setDiodeType] = useState<'silicon' | 'zener'>('silicon');
  const [appliedVoltage, setAppliedVoltage] = useState<number>(0.65); // -5V to +1.2V
  const [rectifierMode, setRectifierMode] = useState<'half_wave' | 'full_wave'>('half_wave');
  const [filterCap, setFilterCap] = useState<boolean>(true);

  // Shockley parameters
  const vGamma = diodeType === 'silicon' ? 0.7 : 0.7;
  const vZener = diodeType === 'zener' ? -3.3 : -50;
  
  // Calculate current approx
  let current_mA = 0;
  if (appliedVoltage > 0) {
    if (appliedVoltage < vGamma) {
      current_mA = Math.exp((appliedVoltage - vGamma) * 10) * 0.5;
    } else {
      current_mA = 0.5 + (appliedVoltage - vGamma) * 45; // linear region with internal resistance
    }
  } else {
    if (diodeType === 'zener' && appliedVoltage <= vZener) {
      current_mA = -(Math.abs(appliedVoltage - vZener) * 25);
    } else {
      current_mA = -0.00001; // tiny leakage
    }
  }

  return (
    <div className="bg-white/90 dark:bg-[#16241A]/90 backdrop-blur-sm rounded-3xl p-4 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 shadow-sm w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#FA8989] text-white flex items-center justify-center text-xs font-bold">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans']">
            Laboratorio: Curva I-V Diodo & Rectificación
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <button
            onClick={() => setDiodeType('silicon')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
              diodeType === 'silicon' ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white' : 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8]'
            }`}
          >
            Silicio (V_γ ≈ 0.7V)
          </button>
          <button
            onClick={() => setDiodeType('zener')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
              diodeType === 'zener' ? 'bg-[#941C2F] dark:bg-[#C0334A] text-white' : 'bg-[#FDC2B1] dark:bg-[#4A2530] text-[#941C2F] dark:text-[#FF9FAE]'
            }`}
          >
            Zener (V_Z = 3.3V)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Graph 1: I-V Curve */}
        <div className="bg-[#FFFBD9]/80 dark:bg-[#0F1A0F]/80 rounded-2xl p-2.5 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
          <div className="text-[11px] font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1 flex justify-between">
            <span>Curva Característica I-V</span>
            <span className="font-mono text-[#941C2F] dark:text-[#FF9FAE]">
              V_d = {appliedVoltage.toFixed(2)} V | I_d = {current_mA.toFixed(2)} mA
            </span>
          </div>

          <svg viewBox="0 0 240 160" className="w-full h-36 bg-white/60 dark:bg-[#16241A]/60 rounded-xl">
            {/* Axis */}
            <line x1="20" y1="110" x2="220" y2="110" className="stroke-[#546C37] dark:stroke-[#6E8F47]" strokeWidth="1.5" />
            <line x1="80" y1="10" x2="80" y2="150" className="stroke-[#546C37] dark:stroke-[#6E8F47]" strokeWidth="1.5" />

            {/* Labels */}
            <text x="220" y="125" fontSize="10" className="fill-[#546C37] dark:fill-[#CFE3A8]" textAnchor="end">V_D (V)</text>
            <text x="75" y="20" fontSize="10" className="fill-[#546C37] dark:fill-[#CFE3A8]" textAnchor="end">I_D (mA)</text>

            {/* 0.7V Marker */}
            <line x1="140" y1="105" x2="140" y2="115" className="stroke-[#941C2F] dark:stroke-[#FF9FAE]" strokeWidth="1" />
            <text x="140" y="125" fontSize="9" className="fill-[#941C2F] dark:fill-[#FF9FAE]" textAnchor="middle">0.7V</text>

            {/* Zener Marker if zener */}
            {diodeType === 'zener' && (
              <>
                <line x1="30" y1="105" x2="30" y2="115" className="stroke-[#941C2F] dark:stroke-[#FF9FAE]" strokeWidth="1" />
                <text x="30" y="125" fontSize="9" className="fill-[#941C2F] dark:fill-[#FF9FAE]" textAnchor="middle">-3.3V</text>
                {/* Zener breakdown curve */}
                <path d="M 80 110 L 35 110 L 30 145" fill="none" className="stroke-[#941C2F] dark:stroke-[#FF9FAE]" strokeWidth="2.5" />
              </>
            )}

            {/* Standard Exponential Curve */}
            <path
              d="M 20 110 L 130 110 Q 140 108 150 90 L 170 20"
              fill="none"
              className="stroke-[#546C37] dark:stroke-[#6E8F47]"
              strokeWidth="2.5"
            />

            {/* Active Operating Point Dot */}
            {appliedVoltage >= 0 && (
              <circle
                cx={Math.min(210, 80 + appliedVoltage * 85)}
                cy={Math.max(15, 110 - Math.min(100, current_mA * 4))}
                r="4.5"
                fill="#FA8989"
                stroke="#941C2F"
                className="dark:stroke-[#FF9FAE]"
                strokeWidth="1.5"
              />
            )}
          </svg>

          {/* Slider */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#546C37] dark:text-[#CFE3A8]">Voltaje V_d:</span>
            <input
              type="range"
              min={diodeType === 'zener' ? "-4" : "-1"}
              max="1.2"
              step="0.05"
              value={appliedVoltage}
              onChange={(e) => setAppliedVoltage(Number(e.target.value))}
              className="accent-[#546C37] dark:accent-[#8FB35E] w-36 cursor-pointer"
            />
            <span className="font-mono font-bold text-[#546C37] dark:text-[#CFE3A8]">{appliedVoltage.toFixed(2)} V</span>
          </div>
        </div>

        {/* Graph 2: Rectifier Waveform */}
        <div className="bg-[#FFFBD9]/80 dark:bg-[#0F1A0F]/80 rounded-2xl p-2.5 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1">
            <span>Forma de Onda Rectificada</span>
            <div className="flex gap-1">
              <button
                onClick={() => setRectifierMode('half_wave')}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                  rectifierMode === 'half_wave' ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white' : 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8]'
                }`}
              >
                Media Onda
              </button>
              <button
                onClick={() => setRectifierMode('full_wave')}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                  rectifierMode === 'full_wave' ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white' : 'bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8]'
                }`}
              >
                Onda Completa
              </button>
            </div>
          </div>

          <svg viewBox="0 0 240 160" className="w-full h-36 bg-white/60 dark:bg-[#16241A]/60 rounded-xl">
            {/* Center line */}
            <line x1="10" y1="80" x2="230" y2="80" className="stroke-[#ADCA88] dark:stroke-[#3C5A40]" strokeWidth="1" strokeDasharray="3 3" />

            {/* AC Input Wave (light dashed) */}
            <path
              d="M 10 80 Q 35 20 60 80 Q 85 140 110 80 Q 135 20 160 80 Q 185 140 210 80"
              fill="none"
              className="stroke-[#ADCA88] dark:stroke-[#3C5A40]"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />

            {/* Rectified Output Wave */}
            {rectifierMode === 'half_wave' ? (
              filterCap ? (
                // Filtered with capacitor ripple
                <path
                  d="M 10 80 Q 35 25 55 35 L 110 50 Q 135 25 155 35 L 210 50"
                  fill="none"
                  className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
                  strokeWidth="2.5"
                />
              ) : (
                // Pure half-wave
                <path
                  d="M 10 80 Q 35 25 60 80 L 110 80 Q 135 25 160 80 L 210 80"
                  fill="none"
                  className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
                  strokeWidth="2.5"
                />
              )
            ) : (
              filterCap ? (
                // Full-wave filtered ripple
                <path
                  d="M 10 80 Q 35 25 55 35 L 60 40 Q 85 25 105 35 L 110 40 Q 135 25 155 35 L 160 40 Q 185 25 205 35"
                  fill="none"
                  className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
                  strokeWidth="2.5"
                />
              ) : (
                // Pure full-wave
                <path
                  d="M 10 80 Q 35 25 60 80 Q 85 25 110 80 Q 135 25 160 80 Q 185 25 210 80"
                  fill="none"
                  className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
                  strokeWidth="2.5"
                />
              )
            )}
          </svg>

          <div className="mt-2 flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-[#546C37] dark:text-[#CFE3A8]">
              <input
                type="checkbox"
                checked={filterCap}
                onChange={(e) => setFilterCap(e.target.checked)}
                className="accent-[#546C37] dark:accent-[#8FB35E]"
              />
              <span>Filtro capacitivo (C filtrado)</span>
            </label>
            <span className="font-mono text-[11px] text-[#546C37] dark:text-[#CFE3A8]">
              {filterCap ? 'Rizado ΔV_r reducido' : 'Salida pulsante pura'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
