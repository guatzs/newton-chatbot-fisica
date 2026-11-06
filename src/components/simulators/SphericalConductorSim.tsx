import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Zap } from 'lucide-react';

interface SphericalConductorSimProps {
  initialCharge?: number; // in microCoulombs (e.g. 4.5)
  initialRadius?: number; // in cm (e.g. 15)
  compact?: boolean;
}

export const SphericalConductorSim: React.FC<SphericalConductorSimProps> = ({
  initialCharge = 4.5,
  initialRadius = 15,
  compact = false,
}) => {
  const [charge, setCharge] = useState<number>(initialCharge);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [animating, setAnimating] = useState<boolean>(true);
  const [flowOffset, setFlowOffset] = useState<number>(0);
  const [selectedZone, setSelectedZone] = useState<'interior' | 'surface' | 'exterior'>('surface');

  // Animation frame for flux lines
  useEffect(() => {
    if (!animating) return;
    const interval = setInterval(() => {
      setFlowOffset((prev) => (prev + 1) % 40);
    }, 40);
    return () => clearInterval(interval);
  }, [animating]);

  // Physics calculations (Coulomb constant k = 8.99e9, epsilon_0 = 8.854e-12)
  const qCoulombs = charge * 1e-6;
  const rMeters = radius / 100;
  const surfaceArea = 4 * Math.PI * Math.pow(rMeters, 2);
  const sigmaMicroC_m2 = (charge / surfaceArea).toFixed(2);
  const eSurface_kN_C = ((8.99 * Math.abs(charge)) / Math.pow(rMeters, 2)).toFixed(1);
  const vSurface_kV = ((8.99 * charge) / rMeters).toFixed(1);

  // Visual SVG sizing
  const center = 150;
  const svgRadius = 40 + (radius / 30) * 45; // between 55 and 85 px
  const isPositive = charge >= 0;

  // 12 radial lines of electric field
  const angles = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-3xl p-4 border border-[#ADCA88]/40 shadow-sm ${compact ? 'max-w-md' : 'w-full'}`}>
      {/* Header tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#546C37] text-white flex items-center justify-center text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[#546C37] uppercase tracking-wider font-['Pixelify_Sans']">
            Simulador de Conductor en Equilibrio
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className="bg-[#D6E3B1] text-[#546C37] px-2.5 py-0.5 rounded-full">
            Simetría Radial Esférica
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold ${isPositive ? 'bg-[#FA8989]/30 text-[#941C2F]' : 'bg-blue-100 text-blue-800'}`}>
            Carga Q = {charge > 0 ? `+${charge}` : charge} µC
          </span>
        </div>
      </div>

      {/* Interactive Visual Graphic */}
      <div className="relative bg-[#FFFBD9]/70 rounded-2xl p-2 flex flex-col items-center justify-center border border-[#ADCA88]/20 overflow-hidden">
        <svg viewBox="0 0 300 300" className="w-full max-w-[280px] h-[260px] select-none">
          <defs>
            <radialGradient id="conductorGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFBD9" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#D6E3B1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ADCA88" stopOpacity="0.9" />
            </radialGradient>
          </defs>

          {/* Radial Electric Field Lines */}
          {angles.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = center + Math.cos(rad) * (svgRadius + 4);
            const y1 = center + Math.sin(rad) * (svgRadius + 4);
            const x2 = center + Math.cos(rad) * 140;
            const y2 = center + Math.sin(rad) * 140;
            
            // Flowing particle along line
            const flowProgress = (flowOffset / 40);
            const arrowDist = (svgRadius + 8) + flowProgress * (135 - svgRadius);
            const arrowX = center + Math.cos(rad) * (isPositive ? arrowDist : (140 - (arrowDist - svgRadius)));
            const arrowY = center + Math.sin(rad) * (isPositive ? arrowDist : (140 - (arrowDist - svgRadius)));

            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#941C2F"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity={Math.abs(charge) > 0 ? 0.75 : 0.2}
                />
                {/* Arrowhead / pulse */}
                {animating && Math.abs(charge) > 0 && (
                  <circle
                    cx={arrowX}
                    cy={arrowY}
                    r={2.5}
                    fill="#941C2F"
                  />
                )}
                <line
                  x1={x2}
                  y1={y2}
                  x2={x2 + Math.cos(rad) * 4}
                  y2={y2 + Math.sin(rad) * 4}
                  stroke="#941C2F"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* Conductor Body Circle */}
          <circle
            cx={center}
            cy={center}
            r={svgRadius}
            fill="url(#conductorGrad)"
            stroke="#546C37"
            strokeWidth="3"
            className="cursor-pointer transition-all duration-300"
            onClick={() => setSelectedZone('surface')}
          />

          {/* Internal Gaussian Surface (dashed red circle at r < R) */}
          <circle
            cx={center}
            cy={center}
            r={svgRadius * 0.55}
            fill="none"
            stroke="#941C2F"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="cursor-pointer"
            onClick={() => setSelectedZone('interior')}
          />

          {/* Surface Charges (+ or - signs along the perimeter) */}
          {angles.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const cx = center + Math.cos(rad) * svgRadius;
            const cy = center + Math.sin(rad) * svgRadius;
            return (
              <g key={`sign-${i}`}>
                <circle cx={cx} cy={cy} r={6} fill={isPositive ? '#FA8989' : '#93C5FD'} stroke="#3D121A" strokeWidth="1" />
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#3D121A"
                >
                  {isPositive ? '+' : '−'}
                </text>
              </g>
            );
          })}

          {/* Center text annotations */}
          <text
            x={center}
            y={center - 10}
            textAnchor="middle"
            className="font-bold text-[13px] fill-[#941C2F] font-['Space_Grotesk']"
          >
            E = 0 interior
          </text>
          <text
            x={center}
            y={center + 5}
            textAnchor="middle"
            className="text-[9px] fill-[#546C37] font-medium"
          >
            Q_enc = 0 (r &lt; R)
          </text>
          <text
            x={center}
            y={center + 18}
            textAnchor="middle"
            className="text-[9px] fill-[#546C37] font-semibold"
          >
            V = {vSurface_kV} kV (Cte)
          </text>

          {/* Exterior label */}
          <text
            x={240}
            y={50}
            className="text-[9px] font-semibold fill-[#941C2F]"
          >
            E(r) ∝ 1/r²
          </text>
        </svg>

        {/* Dynamic Zone Inspector Box */}
        <div className="w-full bg-white/95 rounded-xl p-2.5 mt-1 border border-[#ADCA88]/30 flex flex-wrap items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#546C37]">Zona evaluada:</span>
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setSelectedZone('interior')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  selectedZone === 'interior' ? 'bg-[#941C2F] text-white font-bold' : 'bg-[#D6E3B1]/50 text-[#546C37]'
                }`}
              >
                r &lt; R (Interior)
              </button>
              <button
                onClick={() => setSelectedZone('surface')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  selectedZone === 'surface' ? 'bg-[#941C2F] text-white font-bold' : 'bg-[#D6E3B1]/50 text-[#546C37]'
                }`}
              >
                r = R (Borde)
              </button>
              <button
                onClick={() => setSelectedZone('exterior')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  selectedZone === 'exterior' ? 'bg-[#941C2F] text-white font-bold' : 'bg-[#D6E3B1]/50 text-[#546C37]'
                }`}
              >
                r &gt; R (Exterior)
              </button>
            </div>
          </div>

          <div className="text-[#546C37] font-mono text-[11px] bg-[#FFFBD9] px-2 py-0.5 rounded border border-[#ADCA88]/40">
            {selectedZone === 'interior' && 'E = 0 N/C | ρ = 0'}
            {selectedZone === 'surface' && `σ = ${sigmaMicroC_m2} µC/m² | E = ${eSurface_kN_C} kN/C`}
            {selectedZone === 'exterior' && `E(r) = k·Q / r² (Radial)`}
          </div>
        </div>
      </div>

      {/* Sliders & Controls */}
      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#546C37]">Radio esfera R:</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="8"
              max="25"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="accent-[#546C37] w-28 cursor-pointer"
            />
            <span className="font-bold text-[#546C37] w-12 text-right font-['Pixelify_Sans']">
              {radius} cm
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#546C37]">Carga neta Q:</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={charge}
              onChange={(e) => setCharge(Number(e.target.value))}
              className="accent-[#FA8989] w-28 cursor-pointer"
            />
            <span className="font-bold text-[#941C2F] w-12 text-right font-['Pixelify_Sans']">
              {charge > 0 ? `+${charge}` : charge} µC
            </span>
          </div>
        </div>

        {/* Buttons row matching mockup */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setCharge((prev) => -prev)}
            className="flex-1 py-1.5 px-3 bg-[#D6E3B1] hover:bg-[#ADCA88] text-[#546C37] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Invertir polaridad ({charge >= 0 ? '−' : '+'})
          </button>
          <button
            onClick={() => setAnimating(!animating)}
            className="flex-1 py-1.5 px-3 bg-[#941C2F] hover:bg-[#941C2F]/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {animating ? 'Pausar Flujo' : 'Animar Flujo'}
          </button>
        </div>
      </div>
    </div>
  );
};
