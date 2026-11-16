import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Info, RotateCcw } from 'lucide-react';
import { SIM_SPECS } from '../../data/simulations';
import { SimulationAdjustment } from '../../types';
import { formatSci, formatSig } from '../../utils/format';
import {
  bulbBrightness,
  currentArrowLengthPx,
  dotSpeedPxPerS,
  ohmCurrent,
  ohmPower,
} from '../../utils/physics/ohm';

export interface OhmSimProps {
  initialParams?: Partial<{ v: number; res: number }>;
  adjusted?: SimulationAdjustment[];
  compact?: boolean;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 300;

const LOOP_LEFT = 120;
const LOOP_RIGHT = 480;
const LOOP_TOP = 75;
const LOOP_BOTTOM = 225;
const SEG_H = LOOP_RIGHT - LOOP_LEFT; // 360
const SEG_V = LOOP_BOTTOM - LOOP_TOP; // 150
const PERIMETER = 2 * (SEG_H + SEG_V); // 1020
const DOT_COUNT = 24;

const vSpec = SIM_SPECS.ohm.find((s) => s.key === 'v')!;
const resSpec = SIM_SPECS.ohm.find((s) => s.key === 'res')!;

function clampToSpec(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function getUnitForKey(key: string): string {
  const found = SIM_SPECS.ohm.find((s) => s.key === key);
  return found?.unit ?? '';
}

function pointOnPerimeter(distance: number): { x: number; y: number } {
  const s = ((distance % PERIMETER) + PERIMETER) % PERIMETER;
  if (s < SEG_H) {
    return { x: LOOP_LEFT + s, y: LOOP_TOP };
  }
  if (s < SEG_H + SEG_V) {
    return { x: LOOP_RIGHT, y: LOOP_TOP + (s - SEG_H) };
  }
  if (s < 2 * SEG_H + SEG_V) {
    return { x: LOOP_RIGHT - (s - SEG_H - SEG_V), y: LOOP_BOTTOM };
  }
  return { x: LOOP_LEFT, y: LOOP_BOTTOM - (s - 2 * SEG_H - SEG_V) };
}

export const OhmSim: React.FC<OhmSimProps> = ({
  initialParams,
  adjusted,
  compact = false,
}) => {
  const resolvedInitial = useMemo(() => {
    const v = clampToSpec(initialParams?.v, vSpec.min, vSpec.max, vSpec.default);
    const res = clampToSpec(initialParams?.res, resSpec.min, resSpec.max, resSpec.default);
    return { v, res };
  }, [initialParams?.v, initialParams?.res]);

  const [v, setV] = useState<number>(resolvedInitial.v);
  const [res, setRes] = useState<number>(resolvedInitial.res);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [showCurrentArrow, setShowCurrentArrow] = useState<boolean>(true);
  const [dotPhase, setDotPhase] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const lastTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    setV(resolvedInitial.v);
    setRes(resolvedInitial.res);
  }, [resolvedInitial]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => {
      mql.removeEventListener?.('change', update);
    };
  }, []);

  const i_A = ohmCurrent(v, res);
  const p_W = ohmPower(v, res);
  const arrowLen = currentArrowLengthPx(i_A);
  const speedPxPerS = dotSpeedPxPerS(i_A);
  const brightness = bulbBrightness(i_A);

  useEffect(() => {
    if (speedPxPerS <= 0 || prefersReducedMotion) {
      lastTimestampRef.current = null;
      return;
    }

    let rafId = 0;
    const step = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        const dt = Math.min(0.05, Math.max(0, (timestamp - lastTimestampRef.current) / 1000));
        setDotPhase((prev) => (prev + speedPxPerS * dt) % PERIMETER);
      }
      lastTimestampRef.current = timestamp;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      lastTimestampRef.current = null;
    };
  }, [speedPxPerS, prefersReducedMotion]);

  const handleReset = () => {
    setV(resolvedInitial.v);
    setRes(resolvedInitial.res);
    setDotPhase(0);
  };

  const dots = useMemo(() => {
    const spacing = PERIMETER / DOT_COUNT;
    return Array.from({ length: DOT_COUNT }, (_, idx) => pointOnPerimeter(dotPhase + idx * spacing));
  }, [dotPhase]);

  const shouldShowArrow = (showCurrentArrow || prefersReducedMotion) && i_A > 0;
  const arrowCenterX = 185;
  const arrowStartX = arrowCenterX - arrowLen / 2;
  const arrowEndX = arrowCenterX + arrowLen / 2;
  const arrowY = 44;

  const vSig = formatSig(v, 3);
  const resSig = formatSig(res, 3);
  const iSci = formatSci(i_A, 3);
  const pSci = formatSci(p_W, 3);

  const line1 = `V = I · R → ${vSig} V = (${iSci} A) · (${resSig} Ω)`;
  const line2 = `I = V / R = ${vSig} V / ${resSig} Ω = ${iSci} A`;
  const line3 = `P = V · I = ${pSci} W`;

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden bg-white/95 dark:bg-[#16241A]/95 rounded-3xl p-4 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm ${
        compact ? 'max-w-md' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-white flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans'] truncate">
            Simulador: Ley de Ohm
          </span>
        </div>
        <span className="text-xs font-medium text-[#546C37]/85 dark:text-[#CFE3A8]/85 tabular-nums">
          Circuito en serie CC
        </span>
      </div>

      {/* Adjusted range notice */}
      {adjusted && adjusted.length > 0 && (
        <div
          role="status"
          className="mb-3 rounded-xl bg-[#FFF2EE] dark:bg-[#4A2530]/60 border border-[#FA8989]/60 dark:border-[#FF9FAE]/40 px-3 py-2 text-xs text-[#3D121A] dark:text-[#FBE9E4] flex items-start gap-2"
        >
          <Info className="w-4 h-4 text-[#941C2F] dark:text-[#FF9FAE] shrink-0 mt-0.5" />
          <span>
            Valores ajustados al rango del simulador:{' '}
            {adjusted
              .map((a) => `${a.key} = ${a.requested} → ${a.applied} ${getUnitForKey(a.key)}`.trim())
              .join(' · ')}
          </span>
        </div>
      )}

      {/* Main layout */}
      <div className={compact ? 'flex flex-col gap-3' : 'flex flex-col md:flex-row md:items-start gap-4'}>
        {/* Left/Top Scene + Live Formula */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 rounded-2xl p-2 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 overflow-hidden">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              role="img"
              aria-label={`Circuito en serie con batería de ${vSig} voltios, resistencia de ${resSig} ohmios, corriente de ${
                i_A === 0 ? '0 amperios' : `${iSci} amperios`
              } y potencia de ${p_W === 0 ? '0 vatios' : `${pSci} vatios`}.`}
              className="w-full h-auto select-none block"
            >
              <defs>
                <radialGradient id="bulbGlowGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#FACC15" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Top-right note on conventional current */}
              <text
                x={SVG_WIDTH - 14}
                y={22}
                textAnchor="end"
                className="text-[10px] fill-[#546C37]/75 dark:fill-[#CFE3A8]/75 font-['Space_Grotesk']"
              >
                Corriente convencional (+ → −)
              </text>

              {/* Circuit rectangular wires (breaks around resistor, battery, bulb) */}
              <g className="stroke-[#546C37] dark:stroke-[#8FB35E]" strokeWidth={3.5} fill="none" strokeLinecap="round">
                {/* Top left to resistor */}
                <line x1={LOOP_LEFT} y1={LOOP_TOP} x2={252} y2={LOOP_TOP} />
                {/* Top right from resistor to corner */}
                <line x1={348} y1={LOOP_TOP} x2={LOOP_RIGHT} y2={LOOP_TOP} />
                {/* Right top to bulb */}
                <line x1={LOOP_RIGHT} y1={LOOP_TOP} x2={LOOP_RIGHT} y2={122} />
                {/* Right bulb to bottom */}
                <line x1={LOOP_RIGHT} y1={178} x2={LOOP_RIGHT} y2={LOOP_BOTTOM} />
                {/* Bottom return wire */}
                <line x1={LOOP_RIGHT} y1={LOOP_BOTTOM} x2={LOOP_LEFT} y2={LOOP_BOTTOM} />
                {/* Left bottom to battery */}
                <line x1={LOOP_LEFT} y1={LOOP_BOTTOM} x2={LOOP_LEFT} y2={166} />
                {/* Left battery to top */}
                <line x1={LOOP_LEFT} y1={134} x2={LOOP_LEFT} y2={LOOP_TOP} />
              </g>

              {/* Current dots flowing clockwise along the perimeter */}
              {dots.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={3.5}
                  fill="#FA8989"
                  stroke="#3D121A"
                  strokeWidth={1}
                  opacity={i_A > 0 ? 0.95 : 0.4}
                />
              ))}

              {/* Battery (left vertical branch centered at 120, 150) */}
              <g>
                <rect
                  x={98}
                  y={128}
                  width={44}
                  height={44}
                  rx={8}
                  className="fill-[#FFFBD9] dark:fill-[#16241A] stroke-[#ADCA88]/70 dark:stroke-[#3C5A40]/70"
                  strokeWidth={1.5}
                />
                {/* Long positive plate (top) */}
                <line x1={104} y1={142} x2={136} y2={142} stroke="#941C2F" strokeWidth={3} strokeLinecap="round" />
                {/* Short negative plate (bottom) */}
                <line x1={110} y1={156} x2={130} y2={156} stroke="#3D121A" className="dark:stroke-[#CFE3A8]" strokeWidth={4} strokeLinecap="round" />
                {/* Wire stubs into plates */}
                <line x1={LOOP_LEFT} y1={134} x2={LOOP_LEFT} y2={142} className="stroke-[#546C37] dark:stroke-[#8FB35E]" strokeWidth={3} />
                <line x1={LOOP_LEFT} y1={156} x2={LOOP_LEFT} y2={166} className="stroke-[#546C37] dark:stroke-[#8FB35E]" strokeWidth={3} />
                <text x={148} y={142} fontSize="13" fontWeight="bold" className="fill-[#941C2F] dark:fill-[#FF9FAE]">
                  +
                </text>
                <text x={148} y={162} fontSize="14" fontWeight="bold" className="fill-[#3D121A] dark:fill-[#CFE3A8]">
                  −
                </text>
                {showValues && (
                  <text
                    x={90}
                    y={154}
                    textAnchor="end"
                    className="text-[12px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-['Space_Grotesk'] tabular-nums"
                  >
                    V = {vSig} V
                  </text>
                )}
              </g>

              {/* Resistor zigzag (top horizontal branch centered at 300, 75) */}
              <g>
                <rect
                  x={248}
                  y={58}
                  width={104}
                  height={34}
                  rx={8}
                  className="fill-[#FFFBD9] dark:fill-[#16241A] stroke-[#ADCA88]/70 dark:stroke-[#3C5A40]/70"
                  strokeWidth={1.5}
                />
                <polyline
                  points="252,75 260,64 272,86 284,64 296,86 308,64 320,86 332,64 340,75 348,75"
                  fill="none"
                  stroke="#3D121A"
                  className="dark:stroke-[#FBE9E4]"
                  strokeWidth={2.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {showValues && (
                  <text
                    x={300}
                    y={48}
                    textAnchor="middle"
                    className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk'] tabular-nums"
                  >
                    R = {resSig} Ω
                  </text>
                )}
              </g>

              {/* Light bulb indicator (right vertical branch centered at 480, 150) */}
              <g>
                {/* Glow halo */}
                {brightness > 0 && (
                  <circle
                    cx={LOOP_RIGHT}
                    cy={150}
                    r={26 + 26 * brightness}
                    fill="url(#bulbGlowGrad)"
                    opacity={brightness}
                  />
                )}
                {/* Bulb glass globe */}
                <circle
                  cx={LOOP_RIGHT}
                  cy={150}
                  r={22}
                  fill={brightness > 0 ? '#FEF08A' : '#E2E8F0'}
                  fillOpacity={brightness > 0 ? 0.3 + 0.65 * brightness : 0.45}
                  stroke="#3D121A"
                  className="dark:stroke-[#CFE3A8]"
                  strokeWidth={2.2}
                />
                {/* Filament */}
                <polyline
                  points="480,128 480,142 473,150 480,145 487,150 480,158 480,172"
                  fill="none"
                  stroke={brightness > 0 ? '#B45309' : '#64748B'}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <text
                  x={510}
                  y={146}
                  textAnchor="start"
                  className="text-[11px] font-semibold fill-[#546C37] dark:fill-[#CFE3A8] font-['Space_Grotesk']"
                >
                  Bombilla
                </text>
                <text
                  x={510}
                  y={162}
                  textAnchor="start"
                  className="text-[10px] font-medium fill-[#546C37]/80 dark:fill-[#CFE3A8]/80 font-['Space_Grotesk'] tabular-nums"
                >
                  {i_A === 0 ? 'Apagada' : showValues ? `Brillo ${Math.round(brightness * 100)}%` : 'Encendida'}
                </text>
              </g>

              {/* Current arrow above top wire */}
              {shouldShowArrow && (
                <g className="stroke-[#941C2F] dark:stroke-[#FF9FAE] fill-[#941C2F] dark:fill-[#FF9FAE]">
                  <line
                    x1={arrowStartX}
                    y1={arrowY}
                    x2={arrowEndX - 6}
                    y2={arrowY}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${arrowEndX},${arrowY} ${arrowEndX - 8},${arrowY - 5} ${arrowEndX - 8},${arrowY + 5}`}
                    stroke="none"
                  />
                  {showValues && (
                    <text
                      x={arrowCenterX}
                      y={27}
                      textAnchor="middle"
                      stroke="none"
                      className="text-[11px] font-bold font-['Space_Grotesk'] tabular-nums"
                    >
                      I = {iSci} A
                    </text>
                  )}
                </g>
              )}

              {/* Zero current indicator when I = 0 and showValues */}
              {i_A === 0 && showValues && (
                <text
                  x={arrowCenterX}
                  y={44}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-['Space_Grotesk']"
                >
                  I = 0 A
                </text>
              )}

              {/* Bottom indicator caption */}
              <text
                x={300}
                y={254}
                textAnchor="middle"
                className="text-[10px] fill-[#546C37]/75 dark:fill-[#CFE3A8]/75 font-['Space_Grotesk']"
              >
                La bombilla es un indicador visual de corriente (R total = R)
              </text>
            </svg>
          </div>

          {/* Live Formula Box */}
          <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl px-3 py-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 text-xs text-[#3D121A] dark:text-[#FBE9E4] font-mono tabular-nums space-y-1 break-words">
            <div>{line1}</div>
            <div className="font-bold text-[#941C2F] dark:text-[#FF9FAE]">{line2}</div>
            <div>{line3}</div>
          </div>
        </div>

        {/* Right/Bottom Control Panel */}
        <div
          className={`bg-[#FFFBD9]/50 dark:bg-[#0F1A0F]/60 rounded-2xl p-3 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 space-y-3 ${
            compact ? 'w-full' : 'w-full md:w-64 shrink-0'
          }`}
        >
          {/* Slider V */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ohm-v" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Voltaje (V)
              </label>
              <span className="font-bold text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] tabular-nums">
                {vSig} {vSpec.unit}
              </span>
            </div>
            <input
              id="ohm-v"
              type="range"
              min={vSpec.min}
              max={vSpec.max}
              step={vSpec.step}
              value={v}
              onChange={(e) => setV(Number(e.target.value))}
              aria-label="Voltaje en voltios"
              className="w-full h-9 accent-[#941C2F] dark:accent-[#FF9FAE] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
            />
          </div>

          {/* Slider R */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ohm-res" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Resistencia (R)
              </label>
              <span className="font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] tabular-nums">
                {resSig} {resSpec.unit}
              </span>
            </div>
            <input
              id="ohm-res"
              type="range"
              min={resSpec.min}
              max={resSpec.max}
              step={resSpec.step}
              value={res}
              onChange={(e) => setRes(Number(e.target.value))}
              aria-label="Resistencia en ohmios"
              className="w-full h-9 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
            />
          </div>

          {/* Checkboxes */}
          <div className="pt-1 space-y-1 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
            <label className="min-h-[44px] flex items-center gap-2.5 text-xs font-medium text-[#546C37] dark:text-[#CFE3A8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showValues}
                onChange={(e) => setShowValues(e.target.checked)}
                aria-label="Mostrar valores"
                className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] rounded cursor-pointer"
              />
              <span>Mostrar valores</span>
            </label>

            <label className="min-h-[44px] flex items-center gap-2.5 text-xs font-medium text-[#546C37] dark:text-[#CFE3A8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCurrentArrow}
                onChange={(e) => setShowCurrentArrow(e.target.checked)}
                aria-label="Mostrar flecha de corriente"
                className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] rounded cursor-pointer"
              />
              <span>Mostrar flecha de corriente</span>
            </label>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[44px] py-2 px-4 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
