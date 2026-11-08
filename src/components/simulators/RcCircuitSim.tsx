import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';

export const RcCircuitSim: React.FC = () => {
  const [resistance, setResistance] = useState<number>(10); // in kOhms
  const [capacitance, setCapacitance] = useState<number>(100); // in uF
  const [sourceVoltage, setSourceVoltage] = useState<number>(12); // in Volts
  const [mode, setMode] = useState<'charge' | 'discharge'>('charge');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timeSec, setTimeSec] = useState<number>(0);
  const [history, setHistory] = useState<{ t: number; v: number; i: number }[]>([]);

  // tau = R * C (kOhm * uF = seconds)
  const tau = (resistance * 1e3 * capacitance * 1e-6); // in seconds

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeSec((prevT) => {
        const nextT = prevT + 0.05;
        let v = 0;
        let i = 0;
        if (mode === 'charge') {
          v = sourceVoltage * (1 - Math.exp(-nextT / tau));
          i = (sourceVoltage / (resistance * 1e3)) * Math.exp(-nextT / tau) * 1000; // in mA
        } else {
          v = sourceVoltage * Math.exp(-nextT / tau);
          i = -(sourceVoltage / (resistance * 1e3)) * Math.exp(-nextT / tau) * 1000;
        }

        setHistory((prev) => {
          const updated = [...prev, { t: nextT, v, i }];
          if (updated.length > 50) updated.shift();
          return updated;
        });

        return nextT;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isRunning, mode, tau, sourceVoltage, resistance]);

  const resetSim = () => {
    setTimeSec(0);
    setHistory([]);
  };

  const currentV = history.length > 0 ? history[history.length - 1].v : (mode === 'charge' ? 0 : sourceVoltage);
  const currentI = history.length > 0 ? history[history.length - 1].i : (mode === 'charge' ? (sourceVoltage / resistance) : 0);

  return (
    <div className="bg-white/90 dark:bg-[#16241A]/90 backdrop-blur-sm rounded-3xl p-4 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 shadow-sm w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#941C2F] dark:bg-[#C0334A] text-white flex items-center justify-center text-xs font-bold">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans']">
            Laboratorio Virtual: Circuito RC Transitorio
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium">
          <span className="bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2.5 py-0.5 rounded-full">
            τ = {tau.toFixed(2)} s
          </span>
          <span className="bg-[#FA8989]/30 text-[#941C2F] dark:text-[#FF9FAE] px-2.5 py-0.5 rounded-full font-bold">
            {mode === 'charge' ? 'Carga (1 - e⁻ᵗ/ᴿᶜ)' : 'Descarga (e⁻ᵗ/ᴿᶜ)'}
          </span>
        </div>
      </div>

      {/* Oscilloscope Canvas Representation */}
      <div className="bg-[#1A2612] text-[#ADCA88] rounded-2xl p-3 border border-[#546C37] dark:border-[#3C5A40] font-mono text-xs relative overflow-hidden">
        <div className="flex justify-between items-center text-[10px] text-[#ADCA88]/80 mb-1 border-b border-[#546C37]/50 dark:border-[#3C5A40]/50 pb-1">
          <span>OSCILOSCOPIO CH1: V_c(t) [0 - {sourceVoltage}V]</span>
          <span>t = {timeSec.toFixed(2)} s ({(timeSec / tau).toFixed(1)} τ)</span>
        </div>

        {/* SVG Waveform Graph */}
        <div className="h-32 w-full relative">
          <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
            {/* Grid */}
            <line x1="0" y1="30" x2="400" y2="30" stroke="#546C37" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="400" y2="60" stroke="#546C37" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="400" y2="90" stroke="#546C37" strokeWidth="0.5" strokeDasharray="3 3" />

            {/* 63.2% tau marker line for charge */}
            {mode === 'charge' && (
              <line
                x1="0"
                y1={120 - (0.632 * 100)}
                x2="400"
                y2={120 - (0.632 * 100)}
                stroke="#FA8989"
                strokeWidth="0.8"
                strokeDasharray="4 2"
              />
            )}

            {/* Voltage Trace */}
            {history.length > 1 && (
              <polyline
                fill="none"
                stroke="#ADCA88"
                strokeWidth="2.5"
                points={history
                  .map((pt, i) => {
                    const x = (i / 50) * 400;
                    const y = 110 - (pt.v / sourceVoltage) * 100;
                    return `${x},${Math.max(10, Math.min(115, y))}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>
        </div>

        {/* Digital Readout */}
        <div className="flex justify-between items-center text-xs mt-1 pt-1 border-t border-[#546C37]/50 dark:border-[#3C5A40]/50">
          <span className="text-[#FFFBD9] dark:text-[#FBE9E4]">
            V_c: <strong className="text-[#ADCA88]">{currentV.toFixed(2)} V</strong>
          </span>
          <span className="text-[#FFFBD9] dark:text-[#FBE9E4]">
            I(t): <strong className="text-[#FA8989] dark:text-[#FF9FAE]">{Math.abs(currentI).toFixed(3)} mA</strong>
          </span>
          <span className="text-[#FFFBD9] dark:text-[#FBE9E4]">
            Q(t): <strong className="text-[#D6E3B1] dark:text-[#CFE3A8]">{(currentV * capacitance).toFixed(1)} µC</strong>
          </span>
        </div>
      </div>

      {/* Sliders & Switches */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-[#FFFBD9]/80 dark:bg-[#0F1A0F]/80 p-2 rounded-xl border border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
          <div className="flex justify-between text-[#546C37] dark:text-[#CFE3A8] mb-1">
            <span>Resistencia R:</span>
            <strong>{resistance} kΩ</strong>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={resistance}
            onChange={(e) => { setResistance(Number(e.target.value)); resetSim(); }}
            className="w-full accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer"
          />
        </div>

        <div className="bg-[#FFFBD9]/80 dark:bg-[#0F1A0F]/80 p-2 rounded-xl border border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
          <div className="flex justify-between text-[#546C37] dark:text-[#CFE3A8] mb-1">
            <span>Capacitancia C:</span>
            <strong>{capacitance} µF</strong>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={capacitance}
            onChange={(e) => { setCapacitance(Number(e.target.value)); resetSim(); }}
            className="w-full accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer"
          />
        </div>

        <div className="bg-[#FFFBD9]/80 dark:bg-[#0F1A0F]/80 p-2 rounded-xl border border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
          <div className="flex justify-between text-[#546C37] dark:text-[#CFE3A8] mb-1">
            <span>Fuente ε:</span>
            <strong>{sourceVoltage} V</strong>
          </div>
          <input
            type="range"
            min="3"
            max="24"
            value={sourceVoltage}
            onChange={(e) => { setSourceVoltage(Number(e.target.value)); resetSim(); }}
            className="w-full accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => {
            setMode(mode === 'charge' ? 'discharge' : 'charge');
            resetSim();
          }}
          className="flex-1 py-1.5 px-3 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Modo: {mode === 'charge' ? '⚡ Carga' : '🔋 Descarga'}
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="py-1.5 px-3 bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#546C37]/90 dark:hover:bg-[#6E8F47]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? 'Pausa' : 'Reanudar'}
        </button>
        <button
          onClick={resetSim}
          className="py-1.5 px-3 bg-[#FA8989] hover:bg-[#FA8989]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>
      </div>
    </div>
  );
};
