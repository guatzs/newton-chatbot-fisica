import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Pause, Play, RefreshCw, Zap } from 'lucide-react';
import {
  evaluateSphericalConductor,
  formatElectricFlux,
  GAUSS_MAX_ABS_CHARGE_UC,
  GAUSS_MAX_RADIUS_CM,
  GAUSS_MAX_SPHERE_RADIUS_CM,
  GAUSS_MIN_SPHERE_RADIUS_CM,
  GaussZone,
  representativeGaussianRadiusForZone,
} from '../../utils/physics/gauss';

interface SphericalConductorSimProps {
  initialCharge?: number; // in microCoulombs (e.g. 4.5)
  initialRadius?: number; // in cm (e.g. 15)
  compact?: boolean;
}

const SVG_SIZE = 320;
const SVG_CENTER = SVG_SIZE / 2;
const SVG_MAX_R_PX = 136; // maps 40 cm -> 136 px linearly (3.4 px/cm)
const PX_PER_CM = SVG_MAX_R_PX / GAUSS_MAX_RADIUS_CM;
const FIELD_OUTER_PX = 148;

// Analytical mini-graph geometry
const GRAPH_W = 480;
const GRAPH_H = 188;
const PLOT_LEFT = 46;
const PLOT_RIGHT = 462;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 152;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

function formatSigned(value: number, decimals = 1): string {
  if (Math.abs(value) < 1e-9) {
    return (0).toFixed(decimals);
  }
  const formatted = Math.abs(value).toFixed(decimals);
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

function formatField(kN_C: number): string {
  if (kN_C < 1e-6) {
    return '0.0 kN/C';
  }
  if (kN_C >= 1000) {
    return `${kN_C.toFixed(0)} kN/C`;
  }
  return `${kN_C.toFixed(1)} kN/C`;
}

export const SphericalConductorSim: React.FC<SphericalConductorSimProps> = ({
  initialCharge = 4.5,
  initialRadius = 15,
  compact = false,
}) => {
  const [charge, setCharge] = useState<number>(initialCharge);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [gaussianRadius, setGaussianRadius] = useState<number>(initialRadius);
  const [animating, setAnimating] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [flowPhase, setFlowPhase] = useState<number>(0);

  const graphSvgRef = useRef<SVGSVGElement | null>(null);

  // Respect prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    return undefined;
  }, []);

  // Smooth requestAnimationFrame loop for flux pulses
  useEffect(() => {
    if (!animating || prefersReducedMotion || Math.abs(charge) < 1e-9) {
      return;
    }

    let rafId = 0;
    let lastTimestamp: number | null = null;
    const cycleDurationMs = 1700;

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const dt = Math.min(timestamp - lastTimestamp, 100);
        setFlowPhase((prev) => (prev + dt / cycleDurationMs) % 1);
      }
      lastTimestamp = timestamp;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [animating, prefersReducedMotion, charge]);

  // Exact physics evaluation at current (Q, R, r)
  const physics = useMemo(
    () =>
      evaluateSphericalConductor({
        charge_uC: charge,
        sphereRadius_cm: radius,
        gaussianRadius_cm: gaussianRadius,
      }),
    [charge, radius, gaussianRadius]
  );

  const isNeutral = Math.abs(charge) < 1e-9;
  const isPositive = charge > 0;
  const activeZone: GaussZone = physics.zone;

  // Linear visual radii in SVG coordinates
  const sphereSvgR = radius * PX_PER_CM;
  const gaussianSvgR = gaussianRadius * PX_PER_CM;

  // Radial angles for dynamic field lines (0 to 20 proportional to |Q|)
  const fieldAngles = useMemo(() => {
    if (physics.fieldLineCount <= 0) return [];
    return Array.from(
      { length: physics.fieldLineCount },
      (_, i) => (i * 360) / physics.fieldLineCount
    );
  }, [physics.fieldLineCount]);

  // Surface charge badges (+ / -) capped to avoid overlap on small radii
  const chargeMarkerAngles = useMemo(() => {
    if (physics.fieldLineCount <= 0) return [];
    const maxFitting = Math.max(4, Math.floor((2 * Math.PI * sphereSvgR) / 16));
    const count = Math.min(physics.fieldLineCount, maxFitting);
    return Array.from({ length: count }, (_, i) => (i * 360) / count);
  }, [physics.fieldLineCount, sphereSvgR]);

  const handleZoneClick = (zone: GaussZone) => {
    setGaussianRadius(representativeGaussianRadiusForZone(zone, radius, GAUSS_MAX_RADIUS_CM));
  };

  // Precompute normalized SVG paths for E(r) and |V(r)| analytical curves
  const graphData = useMemo(() => {
    const xForCm = (cm: number) => PLOT_LEFT + (cm / GAUSS_MAX_RADIUS_CM) * PLOT_W;
    const yForNorm = (norm: number) => PLOT_BOTTOM - Math.max(0, Math.min(1, norm)) * PLOT_H;

    const xR = xForCm(radius);
    const xCurrent = xForCm(gaussianRadius);

    const eExteriorPoints: string[] = [];
    const vExteriorPoints: string[] = [];

    if (!isNeutral) {
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const cm = radius + ((GAUSS_MAX_RADIUS_CM - radius) * i) / steps;
        const ratio = radius / cm;
        const eNorm = ratio * ratio; // 1/r^2 decay
        const vNorm = ratio; // 1/r decay
        eExteriorPoints.push(`${xForCm(cm).toFixed(1)},${yForNorm(eNorm).toFixed(1)}`);
        vExteriorPoints.push(`${xForCm(cm).toFixed(1)},${yForNorm(vNorm).toFixed(1)}`);
      }
    }

    const eInteriorPath = `M ${PLOT_LEFT} ${PLOT_BOTTOM} L ${xR.toFixed(1)} ${PLOT_BOTTOM}`;
    const eExteriorPath =
      !isNeutral && eExteriorPoints.length > 0
        ? `M ${eExteriorPoints[0]} L ${eExteriorPoints.slice(1).join(' L ')}`
        : `M ${xR.toFixed(1)} ${PLOT_BOTTOM} L ${PLOT_RIGHT} ${PLOT_BOTTOM}`;

    const vInteriorY = isNeutral ? PLOT_BOTTOM : PLOT_TOP;
    const vInteriorPath = `M ${PLOT_LEFT} ${vInteriorY} L ${xR.toFixed(1)} ${vInteriorY}`;
    const vExteriorPath =
      !isNeutral && vExteriorPoints.length > 0
        ? `M ${vExteriorPoints[0]} L ${vExteriorPoints.slice(1).join(' L ')}`
        : `M ${xR.toFixed(1)} ${PLOT_BOTTOM} L ${PLOT_RIGHT} ${PLOT_BOTTOM}`;

    // Current normalized values at r = gaussianRadius
    let currentENorm = 0;
    let currentVNorm = 0;
    if (!isNeutral) {
      if (activeZone === 'interior') {
        currentENorm = 0;
        currentVNorm = 1;
      } else if (activeZone === 'surface') {
        currentENorm = 1;
        currentVNorm = 1;
      } else {
        const ratio = radius / gaussianRadius;
        currentENorm = ratio * ratio;
        currentVNorm = ratio;
      }
    }

    return {
      xR,
      xCurrent,
      yCurrentE: yForNorm(currentENorm),
      yCurrentV: yForNorm(currentVNorm),
      eInteriorPath,
      eExteriorPath,
      vInteriorPath,
      vExteriorPath,
      xForCm,
    };
  }, [radius, gaussianRadius, isNeutral, activeZone]);

  // Allow clicking on the analytical graph to move r directly
  const handleGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = graphSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * GRAPH_W;
    const clampedRatio = Math.max(0, Math.min(1, (svgX - PLOT_LEFT) / PLOT_W));
    const snappedCm = Math.round(clampedRatio * GAUSS_MAX_RADIUS_CM * 2) / 2;
    setGaussianRadius(snappedCm);
  };

  const zoneEquationText =
    activeZone === 'interior'
      ? 'r < R (Interior): Q_enc = 0 ⇒ Φ_E = 0, E(r) = 0 y V(r) = k·Q/R (cte)'
      : activeZone === 'surface'
      ? `r = R⁺ (Borde): E(R⁺) = k|Q|/R² = |σ|/ε₀ | σ = ${formatSigned(physics.sigma_uC_m2, 2)} µC/m²`
      : `r > R (Exterior): Q_enc = Q ⇒ E(r) = k|Q|/r² y V(r) = k·Q/r`;

  const fieldDirectionLabel = isNeutral
    ? 'Sin carga neta'
    : activeZone === 'interior'
    ? 'Nulo en el interior'
    : isPositive
    ? 'Radial saliente (+)'
    : 'Radial entrante (−)';

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-x-hidden bg-white/90 dark:bg-[#16241A]/90 backdrop-blur-sm rounded-3xl p-3 sm:p-5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 shadow-sm ${
        compact ? 'max-w-md' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#ADCA88]/30 dark:border-[#3C5A40]/30 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-white flex items-center justify-center text-xs font-bold shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans'] break-words">
            Simulador de Conductor en Equilibrio (Ley de Gauss)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium min-w-0">
          <span className="bg-[#D6E3B1] dark:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] px-2.5 py-0.5 rounded-full tabular-nums">
            {physics.fieldLineCount} líneas de campo
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              isNeutral
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                : isPositive
                ? 'bg-[#FA8989]/30 text-[#941C2F] dark:text-[#FF9FAE]'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
            }`}
          >
            Q = {formatSigned(charge, 1)} µC
          </span>
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div
        className={
          compact
            ? 'grid grid-cols-1 gap-4'
            : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'
        }
      >
        {/* Left: Interactive SVG Stage */}
        <div
          className={
            compact ? 'col-span-1 min-w-0 space-y-3' : 'col-span-1 lg:col-span-7 min-w-0 space-y-3'
          }
        >
          <div className="relative w-full min-w-0 bg-[#FFFBD9]/70 dark:bg-[#0F1A0F]/70 rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center border border-[#ADCA88]/30 dark:border-[#3C5A40]/30 overflow-hidden">
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              role="img"
              aria-label={`Esfera conductora de radio ${radius} cm, carga neta ${charge} microcoulombs y superficie gaussiana de radio ${gaussianRadius} cm.`}
              className="w-full h-auto max-h-[340px] sm:max-h-[400px] select-none block"
            >
              <defs>
                <radialGradient id="conductorGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFBD9" stopOpacity="0.45" />
                  <stop offset="82%" stopColor="#D6E3B1" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#ADCA88" stopOpacity="0.95" />
                </radialGradient>
              </defs>

              {/* Subtle radial ruler guides (10, 20, 30, 40 cm) */}
              {[10, 20, 30, 40].map((cm) => {
                const guideR = cm * PX_PER_CM;
                return (
                  <g key={`guide-${cm}`} opacity="0.32">
                    <circle
                      cx={SVG_CENTER}
                      cy={SVG_CENTER}
                      r={guideR}
                      fill="none"
                      className="stroke-[#546C37] dark:stroke-[#8FB35E]"
                      strokeWidth="0.7"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={SVG_CENTER + guideR * 0.707 + 2}
                      y={SVG_CENTER + guideR * 0.707 + 8}
                      fontSize="8"
                      className="fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
                    >
                      {cm}
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Radial Electric Field Lines (proportional to |Q|) */}
              {fieldAngles.map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const startR = sphereSvgR + 3;
                const endR = FIELD_OUTER_PX;
                const x1 = SVG_CENTER + cos * startR;
                const y1 = SVG_CENTER + sin * startR;
                const x2 = SVG_CENTER + cos * endR;
                const y2 = SVG_CENTER + sin * endR;

                // Fixed crisp directional arrowhead along each field line
                const span = Math.max(12, endR - startR);
                const arrowCenterR = startR + span * 0.62;
                const dir = isPositive ? 1 : -1;
                const headLen = 7;
                const headHalfW = 3.4;

                const tipR = arrowCenterR + (dir * headLen) / 2;
                const baseR = arrowCenterR - (dir * headLen) / 2;
                const perpX = -sin * headHalfW;
                const perpY = cos * headHalfW;

                const tipX = SVG_CENTER + cos * tipR;
                const tipY = SVG_CENTER + sin * tipR;
                const baseX = SVG_CENTER + cos * baseR;
                const baseY = SVG_CENTER + sin * baseR;

                const arrowPoints = `${tipX.toFixed(1)},${tipY.toFixed(1)} ${(baseX + perpX).toFixed(1)},${(baseY + perpY).toFixed(1)} ${(baseX - perpX).toFixed(1)},${(baseY - perpY).toFixed(1)}`;

                // Animated pulse dot moving outward (Q > 0) or inward (Q < 0)
                const pulseR = isPositive
                  ? startR + 4 + flowPhase * Math.max(4, endR - startR - 8)
                  : endR - 4 - flowPhase * Math.max(4, endR - startR - 8);
                const pulseX = SVG_CENTER + cos * pulseR;
                const pulseY = SVG_CENTER + sin * pulseR;

                const strokeClass = isPositive
                  ? 'stroke-[#941C2F] dark:stroke-[#FF9FAE]'
                  : 'stroke-blue-700 dark:stroke-blue-400';
                const fillClass = isPositive
                  ? 'fill-[#941C2F] dark:fill-[#FF9FAE]'
                  : 'fill-blue-700 dark:fill-blue-400';

                return (
                  <g key={`field-${i}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={strokeClass}
                      strokeWidth="1.4"
                      opacity="0.78"
                    />
                    <polygon points={arrowPoints} className={fillClass} opacity="0.92" />
                    {animating && !prefersReducedMotion && (
                      <circle
                        cx={pulseX}
                        cy={pulseY}
                        r={2.3}
                        className={fillClass}
                        opacity="0.85"
                      />
                    )}
                  </g>
                );
              })}

              {/* Conductor Sphere Body */}
              <circle
                cx={SVG_CENTER}
                cy={SVG_CENTER}
                r={sphereSvgR}
                fill="url(#conductorGrad)"
                stroke="#546C37"
                strokeWidth="2.8"
                className="cursor-pointer dark:stroke-[#6E8F47]"
                onClick={() => handleZoneClick('surface')}
              />

              {/* Surface Charges (+ or -) along conductor perimeter */}
              {chargeMarkerAngles.map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const cx = SVG_CENTER + Math.cos(rad) * sphereSvgR;
                const cy = SVG_CENTER + Math.sin(rad) * sphereSvgR;
                return (
                  <g key={`sign-${i}`} pointerEvents="none">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5.2}
                      fill={isPositive ? '#FA8989' : '#93C5FD'}
                      stroke="#3D121A"
                      strokeWidth="0.9"
                    />
                    <text
                      x={cx}
                      y={cy + 3}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="bold"
                      fill="#3D121A"
                    >
                      {isPositive ? '+' : '−'}
                    </text>
                  </g>
                );
              })}

              {/* Interactive Gaussian Surface (real-time dashed circle at radius r) */}
              {gaussianSvgR > 0.5 ? (
                <circle
                  cx={SVG_CENTER}
                  cy={SVG_CENTER}
                  r={gaussianSvgR}
                  fill="none"
                  stroke={activeZone === 'interior' ? '#941C2F' : '#B45309'}
                  strokeWidth="2.3"
                  strokeDasharray="6 4"
                  className={
                    activeZone === 'interior'
                      ? 'dark:stroke-[#FF9FAE]'
                      : 'dark:stroke-amber-300'
                  }
                />
              ) : (
                <circle
                  cx={SVG_CENTER}
                  cy={SVG_CENTER}
                  r={4}
                  className="fill-[#941C2F] dark:fill-[#FF9FAE]"
                />
              )}

              {/* Radius vector segment for r */}
              {gaussianSvgR >= 6 && (
                <g pointerEvents="none">
                  <line
                    x1={SVG_CENTER}
                    y1={SVG_CENTER}
                    x2={SVG_CENTER + gaussianSvgR}
                    y2={SVG_CENTER}
                    className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={SVG_CENTER + gaussianSvgR}
                    cy={SVG_CENTER}
                    r={3.5}
                    className="fill-[#941C2F] dark:fill-[#FF9FAE]"
                  />
                </g>
              )}

              {/* Center interior text when sphere is large enough */}
              {sphereSvgR >= 42 && (
                <g pointerEvents="none">
                  <text
                    x={SVG_CENTER}
                    y={SVG_CENTER - 6}
                    textAnchor="middle"
                    className="font-bold text-[11px] fill-[#941C2F] dark:fill-[#FF9FAE] font-['Space_Grotesk']"
                  >
                    E = 0
                  </text>
                  <text
                    x={SVG_CENTER}
                    y={SVG_CENTER + 8}
                    textAnchor="middle"
                    className="text-[8.5px] fill-[#546C37] dark:fill-[#CFE3A8] font-medium"
                  >
                    Interior (r &lt; R)
                  </text>
                </g>
              )}

              {/* Corner spatial HUD badges (always clear, never clipped) */}
              <g pointerEvents="none">
                <rect
                  x="8"
                  y="8"
                  width="96"
                  height="22"
                  rx="7"
                  className="fill-white/85 dark:fill-[#16241A]/85 stroke-[#ADCA88]/60 dark:stroke-[#3C5A40]/60"
                  strokeWidth="1"
                />
                <text
                  x="15"
                  y="22.5"
                  fontSize="9.5"
                  fontWeight="700"
                  className="fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
                >
                  R = {radius.toFixed(1)} cm
                </text>

                <rect
                  x={SVG_SIZE - 106}
                  y="8"
                  width="98"
                  height="22"
                  rx="7"
                  className="fill-white/85 dark:fill-[#16241A]/85 stroke-[#941C2F]/40 dark:stroke-[#FF9FAE]/40"
                  strokeWidth="1"
                />
                <text
                  x={SVG_SIZE - 99}
                  y="22.5"
                  fontSize="9.5"
                  fontWeight="700"
                  className="fill-[#941C2F] dark:fill-[#FF9FAE] font-mono"
                >
                  r = {gaussianRadius.toFixed(1)} cm
                </text>
              </g>
            </svg>

            {/* Compact legend strip under SVG */}
            <div className="w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 mt-1 border-t border-[#ADCA88]/25 dark:border-[#3C5A40]/25 text-[11px] text-[#546C37] dark:text-[#CFE3A8]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#D6E3B1] border-2 border-[#546C37] inline-block" />
                Conductor (R)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#941C2F] dark:border-[#FF9FAE] inline-block" />
                Superficie Gaussiana (r)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full inline-block ${
                    isNeutral
                      ? 'bg-neutral-400'
                      : isPositive
                      ? 'bg-[#941C2F] dark:bg-[#FF9FAE]'
                      : 'bg-blue-700 dark:bg-blue-400'
                  }`}
                />
                {isNeutral ? 'E = 0 (neutro)' : isPositive ? 'Campo saliente' : 'Campo entrante'}
              </span>
            </div>
          </div>

          {/* Synced Zone Selector Buttons */}
          <div className="w-full min-w-0 bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                Zona de la superficie gaussiana:
              </span>
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleZoneClick('interior')}
                  aria-pressed={activeZone === 'interior'}
                  className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-xl text-[11px] transition-colors cursor-pointer ${
                    activeZone === 'interior'
                      ? 'bg-[#941C2F] dark:bg-[#C0334A] text-white font-bold shadow-xs'
                      : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2E4F36]'
                  }`}
                >
                  r &lt; R (Interior)
                </button>
                <button
                  type="button"
                  onClick={() => handleZoneClick('surface')}
                  aria-pressed={activeZone === 'surface'}
                  className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-xl text-[11px] transition-colors cursor-pointer ${
                    activeZone === 'surface'
                      ? 'bg-[#941C2F] dark:bg-[#C0334A] text-white font-bold shadow-xs'
                      : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2E4F36]'
                  }`}
                >
                  r = R (Borde)
                </button>
                <button
                  type="button"
                  onClick={() => handleZoneClick('exterior')}
                  aria-pressed={activeZone === 'exterior'}
                  className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-xl text-[11px] transition-colors cursor-pointer ${
                    activeZone === 'exterior'
                      ? 'bg-[#941C2F] dark:bg-[#C0334A] text-white font-bold shadow-xs'
                      : 'bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#2E4F36]'
                  }`}
                >
                  r &gt; R (Exterior)
                </button>
              </div>
            </div>

            <div className="w-full text-[#546C37] dark:text-[#CFE3A8] font-mono text-[11px] sm:text-xs tabular-nums bg-white/95 dark:bg-[#16241A]/95 px-3 py-2 rounded-xl border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 break-words">
              {zoneEquationText}
            </div>
          </div>
        </div>

        {/* Right: 3 Interactive Sliders & Action Controls */}
        <div
          className={`w-full min-w-0 bg-[#FFFBD9]/55 dark:bg-[#0F1A0F]/65 rounded-2xl p-3 sm:p-4 border border-[#ADCA88]/35 dark:border-[#3C5A40]/35 space-y-4 ${
            compact ? 'col-span-1' : 'col-span-1 lg:col-span-5'
          }`}
        >
          {/* Slider 1: Sphere Radius R */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="gauss-sphere-radius"
                className="font-semibold text-[#546C37] dark:text-[#CFE3A8]"
              >
                Radio de esfera conductora (R)
              </label>
              <span className="font-bold text-[#546C37] dark:text-[#CFE3A8] font-mono tabular-nums">
                {radius.toFixed(1)} cm
              </span>
            </div>
            <input
              id="gauss-sphere-radius"
              type="range"
              min={GAUSS_MIN_SPHERE_RADIUS_CM}
              max={GAUSS_MAX_SPHERE_RADIUS_CM}
              step="0.5"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="Radio de la esfera conductora en centímetros"
              className="accent-[#546C37] dark:accent-[#8FB35E] w-full h-9 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#546C37]/70 dark:text-[#CFE3A8]/70">
              <span>{GAUSS_MIN_SPHERE_RADIUS_CM} cm</span>
              <span>{GAUSS_MAX_SPHERE_RADIUS_CM} cm</span>
            </div>
          </div>

          {/* Slider 2: Net Charge Q */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="gauss-charge"
                className="font-semibold text-[#546C37] dark:text-[#CFE3A8]"
              >
                Carga neta (Q)
              </label>
              <span className="font-bold text-[#941C2F] dark:text-[#FF9FAE] font-mono tabular-nums">
                {formatSigned(charge, 1)} µC
              </span>
            </div>
            <input
              id="gauss-charge"
              type="range"
              min={-GAUSS_MAX_ABS_CHARGE_UC}
              max={GAUSS_MAX_ABS_CHARGE_UC}
              step="0.5"
              value={charge}
              onChange={(e) => setCharge(Number(e.target.value))}
              aria-label="Carga neta en microcoulombs"
              className="accent-[#FA8989] w-full h-9 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#546C37]/70 dark:text-[#CFE3A8]/70">
              <span>−{GAUSS_MAX_ABS_CHARGE_UC} µC</span>
              <span>0</span>
              <span>+{GAUSS_MAX_ABS_CHARGE_UC} µC</span>
            </div>
          </div>

          {/* Slider 3: Gaussian Surface Radius r */}
          <div className="space-y-1 pt-2 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="gauss-surface-radius"
                className="font-semibold text-[#941C2F] dark:text-[#FF9FAE]"
              >
                Radio de superficie gaussiana (r)
              </label>
              <span className="font-bold text-[#941C2F] dark:text-[#FF9FAE] font-mono tabular-nums">
                {gaussianRadius.toFixed(1)} cm
              </span>
            </div>
            <input
              id="gauss-surface-radius"
              type="range"
              min="0"
              max={GAUSS_MAX_RADIUS_CM}
              step="0.5"
              value={gaussianRadius}
              onChange={(e) => setGaussianRadius(Number(e.target.value))}
              aria-label="Radio de la superficie gaussiana en centímetros"
              className="accent-[#941C2F] dark:accent-[#FF9FAE] w-full h-9 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#546C37]/70 dark:text-[#CFE3A8]/70">
              <span>0 cm</span>
              <span>R = {radius.toFixed(1)} cm</span>
              <span>{GAUSS_MAX_RADIUS_CM} cm</span>
            </div>
          </div>

          {/* Quick Surface Readouts */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30 text-xs font-mono tabular-nums">
            <div className="bg-white/90 dark:bg-[#16241A]/90 rounded-xl p-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
              <span className="block text-[10px] text-[#546C37]/75 dark:text-[#CFE3A8]/75">
                Densidad superficial (σ)
              </span>
              <span className="block font-bold text-[#546C37] dark:text-[#CFE3A8] mt-0.5 break-words">
                {formatSigned(physics.sigma_uC_m2, 2)} µC/m²
              </span>
            </div>
            <div className="bg-white/90 dark:bg-[#16241A]/90 rounded-xl p-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
              <span className="block text-[10px] text-[#546C37]/75 dark:text-[#CFE3A8]/75">
                Campo en borde E(R⁺)
              </span>
              <span className="block font-bold text-[#941C2F] dark:text-[#FF9FAE] mt-0.5 break-words">
                {formatField(physics.surfaceField_kN_C)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCharge((prev) => (Math.abs(prev) < 1e-9 ? 4.5 : -prev))}
              className="flex-1 min-w-[135px] min-h-[44px] py-2 px-3 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Invertir polaridad ({charge >= 0 ? '−' : '+'})</span>
            </button>
            <button
              type="button"
              onClick={() => setAnimating((prev) => !prev)}
              className="flex-1 min-w-[135px] min-h-[44px] py-2 px-3 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              {animating ? (
                <Pause className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{animating ? 'Pausar Flujo' : 'Animar Flujo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Results Panel: Exact evaluation at Gaussian radius r */}
      <div className="mt-4 pt-4 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <h4 className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
            Cálculo exacto en la superficie gaussiana (r = {gaussianRadius.toFixed(1)} cm)
          </h4>
          <span className="text-[11px] font-mono text-[#546C37]/75 dark:text-[#CFE3A8]/75 tabular-nums">
            k = 9 × 10⁹ N·m²/C² | ε₀ = 8.85 × 10⁻¹² C²/(N·m²)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono tabular-nums min-w-0">
          <div className="bg-[#FFFBD9]/70 dark:bg-[#0F1A0F]/80 rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
            <span className="block text-[10px] font-sans font-semibold text-[#546C37]/80 dark:text-[#CFE3A8]/80">
              Carga encerrada (Q_enc)
            </span>
            <span className="block text-sm sm:text-base font-bold text-[#546C37] dark:text-[#CFE3A8] mt-1 break-words">
              {formatSigned(physics.qEnc_uC, 1)} µC
            </span>
            <span className="block text-[10px] font-sans text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
              {activeZone === 'interior' ? 'Toda la carga está en R' : 'Encierra toda la carga Q'}
            </span>
          </div>

          <div className="bg-[#FFFBD9]/70 dark:bg-[#0F1A0F]/80 rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
            <span className="block text-[10px] font-sans font-semibold text-[#546C37]/80 dark:text-[#CFE3A8]/80">
              Flujo eléctrico (Φ_E = Q_enc/ε₀)
            </span>
            <span className="block text-sm sm:text-base font-bold text-[#941C2F] dark:text-[#FF9FAE] mt-1 break-words">
              {formatElectricFlux(physics.flux_Nm2_C)}
            </span>
            <span className="block text-[10px] font-sans text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
              {activeZone === 'interior' ? 'Sin flujo neto interior' : 'Constante para r ≥ R'}
            </span>
          </div>

          <div className="bg-[#FFFBD9]/70 dark:bg-[#0F1A0F]/80 rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
            <span className="block text-[10px] font-sans font-semibold text-[#546C37]/80 dark:text-[#CFE3A8]/80">
              Campo eléctrico E(r)
            </span>
            <span className="block text-sm sm:text-base font-bold text-[#941C2F] dark:text-[#FF9FAE] mt-1 break-words">
              {formatField(physics.field_kN_C)}
            </span>
            <span className="block text-[10px] font-sans text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
              {fieldDirectionLabel}
            </span>
          </div>

          <div className="bg-[#FFFBD9]/70 dark:bg-[#0F1A0F]/80 rounded-2xl p-3 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 min-w-0">
            <span className="block text-[10px] font-sans font-semibold text-[#546C37]/80 dark:text-[#CFE3A8]/80">
              Potencial eléctrico V(r)
            </span>
            <span className="block text-sm sm:text-base font-bold text-[#546C37] dark:text-[#CFE3A8] mt-1 break-words">
              {formatSigned(physics.potential_kV, 1)} kV
            </span>
            <span className="block text-[10px] font-sans text-[#546C37]/70 dark:text-[#CFE3A8]/70 mt-0.5">
              {activeZone === 'interior' ? 'Equipotencial = V(R)' : 'Decae como 1/r'}
            </span>
          </div>
        </div>

        {/* Physical Warning Banner (FIS-07): Corona Discharge > 3 MV/m */}
        {physics.exceedsAirDielectricStrength && (
          <div
            role="alert"
            className="w-full min-w-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-400/70 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <span className="font-semibold break-words">
                ⚠️ Supera la rigidez dieléctrica del aire (3 MV/m): habría descarga corona
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold tabular-nums opacity-90">
              E(R⁺) = {formatField(physics.surfaceField_kN_C)}
            </span>
          </div>
        )}

        {/* Mini Analytical SVG Graph of E(r) and V(r) */}
        <div className="w-full min-w-0 bg-[#FFFBD9]/60 dark:bg-[#0F1A0F]/75 rounded-2xl p-3 border border-[#ADCA88]/35 dark:border-[#3C5A40]/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
              Perfil radial analítico: E(r) y |V(r)|
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-[#941C2F] dark:text-[#FF9FAE] font-medium">
                <span className="w-4 border-t-2 border-[#941C2F] dark:border-[#FF9FAE] inline-block" />
                E(r) (1/r²)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#546C37] dark:text-[#9FD36B] font-medium">
                <span className="w-4 border-t-2 border-dashed border-[#546C37] dark:border-[#9FD36B] inline-block" />
                |V(r)| (1/r)
              </span>
              <span className="text-[10px] text-[#546C37]/70 dark:text-[#CFE3A8]/70 hidden sm:inline">
                Haz clic en la curva para mover r
              </span>
            </div>
          </div>

          <svg
            ref={graphSvgRef}
            viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
            onClick={handleGraphClick}
            role="img"
            aria-label={`Gráfico analítico del campo eléctrico E(r) y potencial V(r) desde 0 hasta 40 centímetros con marcador en r = ${gaussianRadius} cm.`}
            className="w-full h-auto block cursor-pointer select-none"
          >
            {/* Shaded interior region (0 <= r <= R) */}
            <rect
              x={PLOT_LEFT}
              y={PLOT_TOP}
              width={Math.max(0, graphData.xR - PLOT_LEFT)}
              height={PLOT_H}
              className="fill-[#D6E3B1]/30 dark:fill-[#24402B]/35"
            />

            {/* Horizontal grid lines (0%, 50%, 100%) */}
            {[0, 0.5, 1].map((frac) => {
              const y = PLOT_BOTTOM - frac * PLOT_H;
              return (
                <g key={`hgrid-${frac}`}>
                  <line
                    x1={PLOT_LEFT}
                    y1={y}
                    x2={PLOT_RIGHT}
                    y2={y}
                    className="stroke-[#ADCA88]/45 dark:stroke-[#3C5A40]/50"
                    strokeWidth="0.9"
                    strokeDasharray={frac === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={PLOT_LEFT - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="9"
                    className="fill-[#546C37]/80 dark:fill-[#CFE3A8]/80 font-mono"
                  >
                    {frac === 0 ? '0' : frac === 0.5 ? '50%' : 'Máx'}
                  </text>
                </g>
              );
            })}

            {/* Axes */}
            <line
              x1={PLOT_LEFT}
              y1={PLOT_TOP}
              x2={PLOT_LEFT}
              y2={PLOT_BOTTOM}
              className="stroke-[#546C37]/70 dark:stroke-[#8FB35E]/70"
              strokeWidth="1.2"
            />
            <line
              x1={PLOT_LEFT}
              y1={PLOT_BOTTOM}
              x2={PLOT_RIGHT}
              y2={PLOT_BOTTOM}
              className="stroke-[#546C37]/70 dark:stroke-[#8FB35E]/70"
              strokeWidth="1.2"
            />

            {/* Vertical reference line at r = R */}
            <line
              x1={graphData.xR}
              y1={PLOT_TOP}
              x2={graphData.xR}
              y2={PLOT_BOTTOM}
              className="stroke-[#546C37] dark:stroke-[#8FB35E]"
              strokeWidth="1.3"
              strokeDasharray="4 3"
            />
            <text
              x={graphData.xR}
              y={PLOT_TOP - 6}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              className="fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
            >
              R={radius.toFixed(0)}cm
            </text>

            {/* V(r) curve (constant interior, 1/r exterior) */}
            <path
              d={graphData.vInteriorPath}
              fill="none"
              className="stroke-[#546C37] dark:stroke-[#9FD36B]"
              strokeWidth="2.2"
              strokeDasharray="5 3"
            />
            <path
              d={graphData.vExteriorPath}
              fill="none"
              className="stroke-[#546C37] dark:stroke-[#9FD36B]"
              strokeWidth="2.2"
              strokeDasharray="5 3"
            />

            {/* E(r) curve (0 interior, jump at R, 1/r^2 exterior) */}
            <path
              d={graphData.eInteriorPath}
              fill="none"
              className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
              strokeWidth="2.4"
            />
            {!isNeutral && (
              <line
                x1={graphData.xR}
                y1={PLOT_BOTTOM}
                x2={graphData.xR}
                y2={PLOT_TOP}
                className="stroke-[#941C2F]/60 dark:stroke-[#FF9FAE]/60"
                strokeWidth="1.4"
                strokeDasharray="2 2"
              />
            )}
            <path
              d={graphData.eExteriorPath}
              fill="none"
              className="stroke-[#941C2F] dark:stroke-[#FF9FAE]"
              strokeWidth="2.4"
            />

            {/* Live movable cursor at current r */}
            <line
              x1={graphData.xCurrent}
              y1={PLOT_TOP}
              x2={graphData.xCurrent}
              y2={PLOT_BOTTOM}
              className="stroke-amber-600 dark:stroke-amber-300"
              strokeWidth="1.6"
            />
            <circle
              cx={graphData.xCurrent}
              cy={graphData.yCurrentV}
              r="4.5"
              className="fill-[#546C37] dark:fill-[#9FD36B] stroke-white dark:stroke-[#0F1A0F]"
              strokeWidth="1.5"
            />
            <circle
              cx={graphData.xCurrent}
              cy={graphData.yCurrentE}
              r="4.5"
              className="fill-[#941C2F] dark:fill-[#FF9FAE] stroke-white dark:stroke-[#0F1A0F]"
              strokeWidth="1.5"
            />

            {/* X-axis ticks (0, 10, 20, 30, 40 cm) */}
            {[0, 10, 20, 30, 40].map((cm) => {
              const tx = graphData.xForCm(cm);
              return (
                <g key={`xtick-${cm}`}>
                  <line
                    x1={tx}
                    y1={PLOT_BOTTOM}
                    x2={tx}
                    y2={PLOT_BOTTOM + 4}
                    className="stroke-[#546C37]/70 dark:stroke-[#8FB35E]/70"
                    strokeWidth="1"
                  />
                  <text
                    x={tx}
                    y={PLOT_BOTTOM + 16}
                    textAnchor="middle"
                    fontSize="9.5"
                    className="fill-[#546C37]/85 dark:fill-[#CFE3A8]/85 font-mono"
                  >
                    {cm}
                  </text>
                </g>
              );
            })}
            <text
              x={(PLOT_LEFT + PLOT_RIGHT) / 2}
              y={GRAPH_H - 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              className="fill-[#546C37] dark:fill-[#CFE3A8]"
            >
              Distancia radial r (cm) — Marcador actual: r = {gaussianRadius.toFixed(1)} cm
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
