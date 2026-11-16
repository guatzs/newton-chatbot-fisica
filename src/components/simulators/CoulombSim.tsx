import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, RotateCcw, Zap } from 'lucide-react';
import { SIM_SPECS } from '../../data/simulations';
import { SimulationAdjustment } from '../../types';
import { formatSci, formatSig } from '../../utils/format';
import {
  COULOMB_MAX_X_M,
  COULOMB_MIN_X_M,
  coulombForce,
  coulombNature,
  fitPositions,
  forceArrowLengthPx,
} from '../../utils/physics/coulomb';

export interface CoulombSimProps {
  initialParams?: Partial<{ q1: number; q2: number; r: number }>;
  adjusted?: SimulationAdjustment[];
  compact?: boolean;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 260;
const AXIS_OFFSET_PX = 15;
const PX_PER_METER = 190;
const SPHERE_RADIUS = 16;
const TOUCH_RADIUS = 22;
const SPHERE_CY = 115;
const RULER_Y = 205;
const COTA_Y = 166;

const q1Spec = SIM_SPECS.coulomb.find((s) => s.key === 'q1')!;
const q2Spec = SIM_SPECS.coulomb.find((s) => s.key === 'q2')!;
const rSpec = SIM_SPECS.coulomb.find((s) => s.key === 'r')!;

function clampToSpec(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function getUnitForKey(key: string): string {
  const found = SIM_SPECS.coulomb.find((s) => s.key === key);
  return found?.unit ?? '';
}

function mToPx(x_m: number): number {
  return AXIS_OFFSET_PX + PX_PER_METER * x_m;
}

function renderHorizontalArrow(
  xStart: number,
  xEnd: number,
  y: number,
  headSize = 7
): { lineX1: number; lineX2: number; points: string } {
  const dir = xEnd >= xStart ? 1 : -1;
  const lineX2 = xEnd - dir * (headSize - 1);
  const p1 = `${xEnd},${y}`;
  const p2 = `${xEnd - dir * headSize},${y - headSize * 0.65}`;
  const p3 = `${xEnd - dir * headSize},${y + headSize * 0.65}`;
  return { lineX1: xStart, lineX2, points: `${p1} ${p2} ${p3}` };
}

export const CoulombSim: React.FC<CoulombSimProps> = ({
  initialParams,
  adjusted,
  compact = false,
}) => {
  const resolvedInitial = useMemo(() => {
    const q1 = clampToSpec(initialParams?.q1, q1Spec.min, q1Spec.max, q1Spec.default);
    const q2 = clampToSpec(initialParams?.q2, q2Spec.min, q2Spec.max, q2Spec.default);
    const r = clampToSpec(initialParams?.r, rSpec.min, rSpec.max, rSpec.default);
    const pos = fitPositions(1.5, r);
    return { q1, q2, r, x1_m: pos.x1_m, x2_m: pos.x2_m };
  }, [initialParams?.q1, initialParams?.q2, initialParams?.r]);

  const [q1, setQ1] = useState<number>(resolvedInitial.q1);
  const [q2, setQ2] = useState<number>(resolvedInitial.q2);
  const [x1_m, setX1_m] = useState<number>(resolvedInitial.x1_m);
  const [x2_m, setX2_m] = useState<number>(resolvedInitial.x2_m);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const [dragging, setDragging] = useState<'q1' | 'q2' | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setQ1(resolvedInitial.q1);
    setQ2(resolvedInitial.q2);
    setX1_m(resolvedInitial.x1_m);
    setX2_m(resolvedInitial.x2_m);
  }, [resolvedInitial]);

  const r_m = Math.min(rSpec.max, Math.max(rSpec.min, x2_m - x1_m));
  const f = coulombForce(q1 * 1e-6, q2 * 1e-6, r_m);
  const nature = coulombNature(f);
  const arrowLen = forceArrowLengthPx(f);

  const cx1 = mToPx(x1_m);
  const cx2 = mToPx(x2_m);
  const midPx = (cx1 + cx2) / 2;

  const handleReset = () => {
    setQ1(resolvedInitial.q1);
    setQ2(resolvedInitial.q2);
    setX1_m(resolvedInitial.x1_m);
    setX2_m(resolvedInitial.x2_m);
  };

  const handleDistanceSlider = (nextR: number) => {
    const clampedR = Math.min(rSpec.max, Math.max(rSpec.min, nextR));
    const currentMid = (x1_m + x2_m) / 2;
    const { x1_m: nextX1, x2_m: nextX2 } = fitPositions(currentMid, clampedR);
    setX1_m(nextX1);
    setX2_m(nextX2);
  };

  const handlePointerDown = (target: 'q1' | 'q2', e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore environments without pointer capture
    }
    setDragging(target);
  };

  const handlePointerMove = (target: 'q1' | 'q2', e: React.PointerEvent<SVGGElement>) => {
    if (dragging !== target || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const x_svg = (e.clientX - rect.left) * (SVG_WIDTH / rect.width);
    const raw_x_m = (x_svg - AXIS_OFFSET_PX) / PX_PER_METER;

    if (target === 'q1') {
      const minX1 = Math.max(COULOMB_MIN_X_M, x2_m - rSpec.max);
      const maxX1 = Math.min(COULOMB_MAX_X_M, x2_m - rSpec.min);
      setX1_m(Math.min(maxX1, Math.max(minX1, raw_x_m)));
    } else {
      const minX2 = Math.max(COULOMB_MIN_X_M, x1_m + rSpec.min);
      const maxX2 = Math.min(COULOMB_MAX_X_M, x1_m + rSpec.max);
      setX2_m(Math.min(maxX2, Math.max(minX2, raw_x_m)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (dragging) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
      setDragging(null);
    }
  };

  // Arrow geometry
  const forceAbsText = f === 0 ? 'F = 0' : `F = ${formatSci(Math.abs(f), 3)} N`;
  const innerGap = cx2 - cx1 - SPHERE_RADIUS * 2;
  const attractiveOverlap = nature === 'atractiva' && arrowLen * 2 > innerGap;
  const leftArrowY = attractiveOverlap ? SPHERE_CY - 4 : SPHERE_CY;
  const rightArrowY = attractiveOverlap ? SPHERE_CY + 4 : SPHERE_CY;

  const leftArrow =
    nature === 'repulsiva'
      ? renderHorizontalArrow(cx1 - SPHERE_RADIUS, cx1 - SPHERE_RADIUS - arrowLen, SPHERE_CY)
      : nature === 'atractiva'
        ? renderHorizontalArrow(cx1 + SPHERE_RADIUS, cx1 + SPHERE_RADIUS + arrowLen, leftArrowY)
        : null;

  const rightArrow =
    nature === 'repulsiva'
      ? renderHorizontalArrow(cx2 + SPHERE_RADIUS, cx2 + SPHERE_RADIUS + arrowLen, SPHERE_CY)
      : nature === 'atractiva'
        ? renderHorizontalArrow(cx2 - SPHERE_RADIUS, cx2 - SPHERE_RADIUS - arrowLen, rightArrowY)
        : null;

  const closeSpheres = cx2 - cx1 < 130;
  const leftForceLabelX = Math.min(SVG_WIDTH - 68, Math.max(68, cx1));
  const rightForceLabelX = Math.min(SVG_WIDTH - 68, Math.max(68, cx2));
  const leftForceLabelY = closeSpheres ? 42 : 54;
  const rightForceLabelY = closeSpheres ? 60 : 54;

  const q1Fill = q1 > 0 ? '#FA8989' : q1 < 0 ? '#93C5FD' : '#E2E8F0';
  const q2Fill = q2 > 0 ? '#FA8989' : q2 < 0 ? '#93C5FD' : '#E2E8F0';
  const q1Sign = q1 > 0 ? '+' : q1 < 0 ? '−' : '0';
  const q2Sign = q2 > 0 ? '+' : q2 < 0 ? '−' : '0';

  const q1AbsSci = formatSci(Math.abs(q1) * 1e-6, 3);
  const q2AbsSci = formatSci(Math.abs(q2) * 1e-6, 3);
  const rSig = formatSig(r_m, 3);
  const fAbsSci = formatSci(Math.abs(f), 3);
  const liveFormula = `F = k·|q₁·q₂| / r² = (8.988 × 10⁹)(${q1AbsSci})(${q2AbsSci}) / (${rSig})² = ${fAbsSci} N — ${nature}`;

  const rulerTicks = Array.from({ length: 31 }, (_, i) => i);

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
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans'] truncate">
            Simulador: Ley de Coulomb
          </span>
        </div>
        <span className="text-xs font-medium text-[#546C37]/85 dark:text-[#CFE3A8]/85 tabular-nums">
          k = 8.988 × 10⁹ N·m²/C²
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

      {/* Main layout: stacked when compact or < 768 px, side-by-side on >= 768 px when not compact */}
      <div className={compact ? 'flex flex-col gap-3' : 'flex flex-col md:flex-row md:items-start gap-4'}>
        {/* Left/Top Scene + Live Formula */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 rounded-2xl p-2 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              role="img"
              aria-label={`Simulación interactiva de la Ley de Coulomb con q1 igual a ${formatSig(
                q1,
                3
              )} microcoulombs, q2 igual a ${formatSig(q2, 3)} microcoulombs y separación ${rSig} metros. Fuerza ${nature} de ${
                f === 0 ? '0' : `${fAbsSci} newtons`
              }.`}
              className="w-full h-auto select-none touch-none block"
            >
              {/* Fixed logarithmic scale note */}
              <text
                x={SVG_WIDTH - 15}
                y={20}
                textAnchor="end"
                className="text-[10px] fill-[#546C37]/75 dark:fill-[#CFE3A8]/75 font-['Space_Grotesk']"
              >
                Longitud de flecha en escala logarítmica
              </text>

              {/* Allowed track line [0.4, 2.6] m */}
              <line
                x1={mToPx(COULOMB_MIN_X_M)}
                y1={SPHERE_CY}
                x2={mToPx(COULOMB_MAX_X_M)}
                y2={SPHERE_CY}
                className="stroke-[#ADCA88]/70 dark:stroke-[#3C5A40]/80"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <line
                x1={mToPx(COULOMB_MIN_X_M)}
                y1={SPHERE_CY - 8}
                x2={mToPx(COULOMB_MIN_X_M)}
                y2={SPHERE_CY + 8}
                className="stroke-[#ADCA88] dark:stroke-[#3C5A40]"
                strokeWidth={1.5}
              />
              <line
                x1={mToPx(COULOMB_MAX_X_M)}
                y1={SPHERE_CY - 8}
                x2={mToPx(COULOMB_MAX_X_M)}
                y2={SPHERE_CY + 8}
                className="stroke-[#ADCA88] dark:stroke-[#3C5A40]"
                strokeWidth={1.5}
              />

              {/* Force Arrows */}
              {showArrows && f === 0 && (
                <text
                  x={midPx}
                  y={48}
                  textAnchor="middle"
                  className="text-[12px] font-bold fill-[#546C37] dark:fill-[#9CC46B] font-['Space_Grotesk']"
                >
                  F = 0
                </text>
              )}

              {showArrows && f !== 0 && leftArrow && rightArrow && (
                <g className="stroke-[#546C37] dark:stroke-[#9CC46B] fill-[#546C37] dark:fill-[#9CC46B]">
                  <line
                    x1={leftArrow.lineX1}
                    y1={leftArrowY}
                    x2={leftArrow.lineX2}
                    y2={leftArrowY}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <polygon points={leftArrow.points} stroke="none" />

                  <line
                    x1={rightArrow.lineX1}
                    y1={rightArrowY}
                    x2={rightArrow.lineX2}
                    y2={rightArrowY}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <polygon points={rightArrow.points} stroke="none" />
                </g>
              )}

              {/* Force numeric labels */}
              {showArrows && showValues && f !== 0 && (
                <g className="fill-[#546C37] dark:fill-[#CFE3A8] font-['Space_Grotesk'] font-bold text-[11px] tabular-nums">
                  <text x={leftForceLabelX} y={leftForceLabelY} textAnchor="middle">
                    {forceAbsText}
                  </text>
                  <text x={rightForceLabelX} y={rightForceLabelY} textAnchor="middle">
                    {forceAbsText}
                  </text>
                </g>
              )}

              {/* Charge labels near spheres */}
              <g className="fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk'] text-[11px] font-semibold tabular-nums">
                <text
                  x={closeSpheres ? cx1 - 6 : cx1}
                  y={90}
                  textAnchor={closeSpheres ? 'end' : 'middle'}
                >
                  {showValues ? `q₁ = ${formatSig(q1, 3)} µC` : 'q₁'}
                </text>
                <text
                  x={closeSpheres ? cx2 + 6 : cx2}
                  y={90}
                  textAnchor={closeSpheres ? 'start' : 'middle'}
                >
                  {showValues ? `q₂ = ${formatSig(q2, 3)} µC` : 'q₂'}
                </text>
              </g>

              {/* Sphere q1 */}
              <g
                onPointerDown={(e) => handlePointerDown('q1', e)}
                onPointerMove={(e) => handlePointerMove('q1', e)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={dragging === 'q1' ? 'cursor-grabbing' : 'cursor-grab'}
              >
                <circle cx={cx1} cy={SPHERE_CY} r={TOUCH_RADIUS} fill="transparent" />
                <circle
                  cx={cx1}
                  cy={SPHERE_CY}
                  r={SPHERE_RADIUS}
                  fill={q1Fill}
                  stroke="#3D121A"
                  strokeWidth={2}
                />
                <text
                  x={cx1}
                  y={SPHERE_CY + 5.5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="#3D121A"
                >
                  {q1Sign}
                </text>
              </g>

              {/* Sphere q2 */}
              <g
                onPointerDown={(e) => handlePointerDown('q2', e)}
                onPointerMove={(e) => handlePointerMove('q2', e)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={dragging === 'q2' ? 'cursor-grabbing' : 'cursor-grab'}
              >
                <circle cx={cx2} cy={SPHERE_CY} r={TOUCH_RADIUS} fill="transparent" />
                <circle
                  cx={cx2}
                  cy={SPHERE_CY}
                  r={SPHERE_RADIUS}
                  fill={q2Fill}
                  stroke="#3D121A"
                  strokeWidth={2}
                />
                <text
                  x={cx2}
                  y={SPHERE_CY + 5.5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="#3D121A"
                >
                  {q2Sign}
                </text>
              </g>

              {/* Dimension line (cota) between spheres */}
              <g className="stroke-[#941C2F] dark:stroke-[#FF9FAE] fill-[#941C2F] dark:fill-[#FF9FAE]">
                <line x1={cx1} y1={137} x2={cx1} y2={172} strokeWidth={1.2} strokeDasharray="2 2" />
                <line x1={cx2} y1={137} x2={cx2} y2={172} strokeWidth={1.2} strokeDasharray="2 2" />
                <line x1={cx1 + 4} y1={COTA_Y} x2={cx2 - 4} y2={COTA_Y} strokeWidth={1.5} />
                <polygon
                  points={`${cx1},${COTA_Y} ${cx1 + 6},${COTA_Y - 3.5} ${cx1 + 6},${COTA_Y + 3.5}`}
                  stroke="none"
                />
                <polygon
                  points={`${cx2},${COTA_Y} ${cx2 - 6},${COTA_Y - 3.5} ${cx2 - 6},${COTA_Y + 3.5}`}
                  stroke="none"
                />
                <text
                  x={midPx}
                  y={COTA_Y + 16}
                  textAnchor="middle"
                  stroke="none"
                  className="text-[11px] font-bold font-['Space_Grotesk'] tabular-nums"
                >
                  r = {rSig} m
                </text>
              </g>

              {/* Horizontal ruler 0 to 3 m */}
              <g>
                <line
                  x1={mToPx(0)}
                  y1={RULER_Y}
                  x2={mToPx(3)}
                  y2={RULER_Y}
                  className="stroke-[#546C37] dark:stroke-[#CFE3A8]"
                  strokeWidth={1.5}
                />
                {rulerTicks.map((t) => {
                  const xm = t / 10;
                  const x = mToPx(xm);
                  const isMajor = t % 5 === 0;
                  return (
                    <g key={t}>
                      <line
                        x1={x}
                        y1={RULER_Y}
                        x2={x}
                        y2={isMajor ? RULER_Y + 10 : RULER_Y + 5}
                        className="stroke-[#546C37] dark:stroke-[#CFE3A8]"
                        strokeWidth={isMajor ? 1.5 : 1}
                      />
                      {isMajor && (
                        <text
                          x={x}
                          y={RULER_Y + 24}
                          textAnchor="middle"
                          className="text-[10px] font-medium fill-[#546C37] dark:fill-[#CFE3A8] font-['Space_Grotesk'] tabular-nums"
                        >
                          {xm.toFixed(1)} m
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Live formula box */}
          <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl px-3 py-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 text-xs text-[#3D121A] dark:text-[#FBE9E4] font-mono tabular-nums break-words">
            {liveFormula}
          </div>
        </div>

        {/* Right/Bottom Control Panel */}
        <div
          className={`bg-[#FFFBD9]/50 dark:bg-[#0F1A0F]/60 rounded-2xl p-3 border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 space-y-3 ${
            compact ? 'w-full' : 'w-full md:w-64 shrink-0'
          }`}
        >
          {/* Slider q1 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="coulomb-q1" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Carga q₁
              </label>
              <span className="font-bold text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] tabular-nums">
                {formatSig(q1, 3)} {q1Spec.unit}
              </span>
            </div>
            <input
              id="coulomb-q1"
              type="range"
              min={q1Spec.min}
              max={q1Spec.max}
              step={q1Spec.step}
              value={q1}
              onChange={(e) => setQ1(Number(e.target.value))}
              aria-label="Carga q1 en microcoulombs"
              className="w-full h-9 accent-[#FA8989] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
            />
          </div>

          {/* Slider q2 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="coulomb-q2" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Carga q₂
              </label>
              <span className="font-bold text-[#941C2F] dark:text-[#FF9FAE] font-['Pixelify_Sans'] tabular-nums">
                {formatSig(q2, 3)} {q2Spec.unit}
              </span>
            </div>
            <input
              id="coulomb-q2"
              type="range"
              min={q2Spec.min}
              max={q2Spec.max}
              step={q2Spec.step}
              value={q2}
              onChange={(e) => setQ2(Number(e.target.value))}
              aria-label="Carga q2 en microcoulombs"
              className="w-full h-9 accent-[#93C5FD] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
            />
          </div>

          {/* Slider r */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="coulomb-r" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Distancia r
              </label>
              <span className="font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] tabular-nums">
                {rSig} {rSpec.unit}
              </span>
            </div>
            <input
              id="coulomb-r"
              type="range"
              min={rSpec.min}
              max={rSpec.max}
              step={rSpec.step}
              value={Number(r_m.toFixed(3))}
              onChange={(e) => handleDistanceSlider(Number(e.target.value))}
              aria-label="Distancia r entre cargas en metros"
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
                checked={showArrows}
                onChange={(e) => setShowArrows(e.target.checked)}
                aria-label="Mostrar flechas"
                className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] rounded cursor-pointer"
              />
              <span>Mostrar flechas</span>
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
