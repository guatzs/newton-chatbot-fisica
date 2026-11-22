import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  RotateCcw,
  Trash2,
  Zap,
} from 'lucide-react';
import { SimulationAdjustment } from '../../types';
import { formatSci, formatSig } from '../../utils/format';
import { K_COULOMB } from '../../utils/physics/constants';
import {
  calculateSuperposition2D,
  ChargeUnit,
  PointCharge2D,
  vectorArrowLength2DPx,
  VectorScaleMode,
} from '../../utils/physics/coulomb';

export interface CoulombSimProps {
  initialParams?: Partial<{ q1: number; q2: number; r: number }>;
  adjusted?: SimulationAdjustment[];
  compact?: boolean;
}

const SVG_SIZE = 520;
const PLOT_PAD = 44;
const PLOT_SIZE = SVG_SIZE - PLOT_PAD * 2; // 432 px
const COORD_MIN = -20;
const COORD_MAX = 20;
const COORD_SPAN = COORD_MAX - COORD_MIN; // 40 cm
const CHARGE_MIN = -50;
const CHARGE_MAX = 50;
const MIN_CHARGES = 2;
const MAX_CHARGES = 5;
const SPHERE_RADIUS = 14;
const TOUCH_RADIUS = 22;

const SUBSCRIPTS = ['₁', '₂', '₃', '₄', '₅'];

// Distinct, accessible colors for individual force vectors on the 2D canvas
const VECTOR_PALETTE = [
  { stroke: '#D97706', textClass: 'text-amber-700 dark:text-amber-300', dot: '#D97706' },
  { stroke: '#0D9488', textClass: 'text-teal-700 dark:text-teal-300', dot: '#0D9488' },
  { stroke: '#7C3AED', textClass: 'text-violet-700 dark:text-violet-300', dot: '#7C3AED' },
  { stroke: '#DB2777', textClass: 'text-pink-700 dark:text-pink-300', dot: '#DB2777' },
  { stroke: '#0284C7', textClass: 'text-sky-700 dark:text-sky-300', dot: '#0284C7' },
];

const NEW_CHARGE_PRESETS: Array<{ q: number; unit: ChargeUnit; x_cm: number; y_cm: number }> = [
  { q: -4, unit: 'nC', x_cm: -10, y_cm: 10 },
  { q: 5, unit: 'nC', x_cm: 10, y_cm: 10 },
  { q: -5, unit: 'nC', x_cm: 12, y_cm: -12 },
  { q: 6, unit: 'nC', x_cm: -12, y_cm: -12 },
  { q: 4, unit: 'nC', x_cm: 0, y_cm: -12 },
];

function createDefaultCharges(initialParams?: Partial<{ q1: number; q2: number; r: number }>): PointCharge2D[] {
  if (
    initialParams &&
    (initialParams.q1 !== undefined || initialParams.q2 !== undefined || initialParams.r !== undefined)
  ) {
    const q1 = clampNumber(initialParams.q1 ?? 4, CHARGE_MIN, CHARGE_MAX);
    const q2 = clampNumber(initialParams.q2 ?? -6, CHARGE_MIN, CHARGE_MAX);
    const halfR = clampNumber(((initialParams.r ?? 0.16) * 100) / 2, 2, 16);
    return [
      { id: 'q1', label: 'q₁', q: q1, unit: 'uC', x_cm: roundHalf(-halfR), y_cm: 0 },
      { id: 'q2', label: 'q₂', q: q2, unit: 'uC', x_cm: roundHalf(halfR), y_cm: 0 },
    ];
  }

  return [
    { id: 'q1', label: 'q₁', q: 4, unit: 'nC', x_cm: -8, y_cm: -4 },
    { id: 'q2', label: 'q₂', q: -6, unit: 'nC', x_cm: 8, y_cm: -4 },
    { id: 'q3', label: 'q₃', q: 3, unit: 'nC', x_cm: 0, y_cm: 8 },
  ];
}

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

function roundHalf(val: number): number {
  return Math.round(val * 2) / 2;
}

function formatNumInput(val: number, maxDecimals = 2): string {
  if (!Number.isFinite(val)) return '0';
  const cleaned = Object.is(val, -0) ? 0 : val;
  if (Number.isInteger(cleaned)) return String(cleaned);
  return String(Number(cleaned.toFixed(maxDecimals)));
}

function parseLocaleNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized || normalized === '-' || normalized === '+' || normalized === '.') {
    return Number.NaN;
  }
  return Number(normalized);
}

function formatForceEngineering(absF: number): string {
  if (!Number.isFinite(absF) || absF === 0) return '0 N';
  if (absF >= 1e3) return `${formatSig(absF / 1e3, 3)} kN`;
  if (absF >= 1) return `${formatSig(absF, 3)} N`;
  if (absF >= 1e-3) return `${formatSig(absF * 1e3, 3)} mN`;
  if (absF >= 1e-6) return `${formatSig(absF * 1e6, 3)} µN`;
  if (absF >= 1e-9) return `${formatSig(absF * 1e9, 3)} nN`;
  return `${formatSci(absF, 3)} N`;
}

function cmToSvgX(x_cm: number): number {
  return PLOT_PAD + ((x_cm - COORD_MIN) / COORD_SPAN) * PLOT_SIZE;
}

function cmToSvgY(y_cm: number): number {
  return PLOT_PAD + ((COORD_MAX - y_cm) / COORD_SPAN) * PLOT_SIZE;
}

function svgXToCm(px: number): number {
  return COORD_MIN + ((px - PLOT_PAD) / PLOT_SIZE) * COORD_SPAN;
}

function svgYToCm(py: number): number {
  return COORD_MAX - ((py - PLOT_PAD) / PLOT_SIZE) * COORD_SPAN;
}

function unitLabel(unit: ChargeUnit): string {
  return unit === 'uC' ? 'µC' : 'nC';
}

function relabelCharges(list: PointCharge2D[]): PointCharge2D[] {
  return list.map((c, idx) => ({
    ...c,
    label: `q${SUBSCRIPTS[idx] ?? idx + 1}`,
  }));
}

/**
 * Construye una flecha vectorial 2D en coordenadas SVG respetando exactamente su ángulo,
 * acotando suavemente la longitud si alcanzara los márgenes del lienzo.
 */
function buildVectorArrow(
  originX: number,
  originY: number,
  fx: number,
  fy: number,
  desiredLenPx: number,
  headSize = 9
): {
  x1: number;
  y1: number;
  lineX2: number;
  lineY2: number;
  tipX: number;
  tipY: number;
  headPoints: string;
  labelX: number;
  labelY: number;
} | null {
  const mag = Math.hypot(fx, fy);
  if (!Number.isFinite(mag) || mag <= 0 || desiredLenPx <= 0) return null;

  // En SVG +X es derecha y +Y es abajo (inverso al eje Y cartesiano)
  const ux = fx / mag;
  const uy = -fy / mag;

  // Limitar la punta dentro de [20, SVG_SIZE - 20] preservando exactamente la dirección
  const margin = 20;
  let maxLen = desiredLenPx;
  if (ux > 1e-6) maxLen = Math.min(maxLen, (SVG_SIZE - margin - originX) / ux);
  if (ux < -1e-6) maxLen = Math.min(maxLen, (margin - originX) / ux);
  if (uy > 1e-6) maxLen = Math.min(maxLen, (SVG_SIZE - margin - originY) / uy);
  if (uy < -1e-6) maxLen = Math.min(maxLen, (margin - originY) / uy);
  const len = Math.max(12, maxLen);

  const startOffset = SPHERE_RADIUS + 2;
  const x1 = originX + ux * startOffset;
  const y1 = originY + uy * startOffset;
  const tipX = originX + ux * (startOffset + len);
  const tipY = originY + uy * (startOffset + len);

  const effectiveHead = Math.min(headSize, Math.max(6, len * 0.45));
  const lineX2 = tipX - ux * (effectiveHead - 1);
  const lineY2 = tipY - uy * (effectiveHead - 1);

  const px = -uy;
  const py = ux;
  const wing = effectiveHead * 0.56;
  const baseX = tipX - ux * effectiveHead;
  const baseY = tipY - uy * effectiveHead;

  const p1 = `${tipX.toFixed(1)},${tipY.toFixed(1)}`;
  const p2 = `${(baseX + px * wing).toFixed(1)},${(baseY + py * wing).toFixed(1)}`;
  const p3 = `${(baseX - px * wing).toFixed(1)},${(baseY - py * wing).toFixed(1)}`;

  const labelX = clampNumber(tipX + ux * 15, 28, SVG_SIZE - 28);
  const labelY = clampNumber(tipY + uy * 15 + 4, 24, SVG_SIZE - 14);

  return {
    x1,
    y1,
    lineX2,
    lineY2,
    tipX,
    tipY,
    headPoints: `${p1} ${p2} ${p3}`,
    labelX,
    labelY,
  };
}

export const CoulombSim: React.FC<CoulombSimProps> = ({
  initialParams,
  compact = false,
}) => {
  const initialCharges = useMemo(
    () => createDefaultCharges(initialParams),
    [initialParams?.q1, initialParams?.q2, initialParams?.r]
  );

  const [charges, setCharges] = useState<PointCharge2D[]>(initialCharges);
  const [targetId, setTargetId] = useState<string>(
    initialCharges[initialCharges.length - 1]?.id ?? 'q1'
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialCharges[initialCharges.length - 1]?.id ?? 'q1'
  );
  const [scaleMode, setScaleMode] = useState<VectorScaleMode>('logarithmic');
  const [showIndividualVectors, setShowIndividualVectors] = useState<boolean>(true);
  const [showLinesOfAction, setShowLinesOfAction] = useState<boolean>(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Draft text states for smooth typing in direct numeric inputs of the selected charge
  const [draftInputs, setDraftInputs] = useState<Record<string, { q?: string; x?: string; y?: string }>>({});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const nextIdCounterRef = useRef<number>(initialCharges.length + 1);

  const activeTargetId = charges.some((c) => c.id === targetId)
    ? targetId
    : charges[0]?.id ?? '';
  const activeSelectedId = charges.some((c) => c.id === selectedId)
    ? selectedId
    : activeTargetId;

  const selectedCharge = charges.find((c) => c.id === activeSelectedId) ?? charges[0];
  const targetCharge = charges.find((c) => c.id === activeTargetId) ?? charges[0];

  const superposition = useMemo(
    () => calculateSuperposition2D(charges, activeTargetId),
    [charges, activeTargetId]
  );

  const maxForceMag = useMemo(() => {
    let maxVal = superposition.netMagnitude;
    for (const c of superposition.contributions) {
      if (c.magnitude > maxVal) maxVal = c.magnitude;
    }
    return maxVal;
  }, [superposition]);

  const clearDraftField = (id: string, field: 'q' | 'x' | 'y') => {
    setDraftInputs((prev) => {
      if (!prev[id] || prev[id][field] === undefined) return prev;
      const nextEntry = { ...prev[id] };
      delete nextEntry[field];
      return { ...prev, [id]: nextEntry };
    });
  };

  const updateCharge = (id: string, patch: Partial<PointCharge2D>) => {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAddCharge = () => {
    if (charges.length >= MAX_CHARGES) return;

    // Pick a preset coordinate that does not overlap any existing charge
    let chosen = NEW_CHARGE_PRESETS[0];
    for (const candidate of NEW_CHARGE_PRESETS) {
      const collides = charges.some(
        (c) => Math.hypot(c.x_cm - candidate.x_cm, c.y_cm - candidate.y_cm) < 2
      );
      if (!collides) {
        chosen = candidate;
        break;
      }
    }

    const newId = `q-${nextIdCounterRef.current++}`;
    const nextList = relabelCharges([
      ...charges,
      {
        id: newId,
        label: `q${SUBSCRIPTS[charges.length] ?? charges.length + 1}`,
        q: chosen.q,
        unit: chosen.unit,
        x_cm: chosen.x_cm,
        y_cm: chosen.y_cm,
      },
    ]);
    setCharges(nextList);
    setSelectedId(newId);
  };

  const handleRemoveCharge = (id: string) => {
    if (charges.length <= MIN_CHARGES) return;
    const filtered = relabelCharges(charges.filter((c) => c.id !== id));
    setCharges(filtered);
    if (activeTargetId === id) {
      setTargetId(filtered[0].id);
    }
    if (activeSelectedId === id) {
      setSelectedId(filtered[0].id);
    }
  };

  const handleReset = () => {
    const defaults = createDefaultCharges(initialParams);
    setCharges(defaults);
    const defaultTarget = defaults[defaults.length - 1]?.id ?? 'q1';
    setTargetId(defaultTarget);
    setSelectedId(defaultTarget);
    setDraftInputs({});
    setScaleMode('logarithmic');
    setShowIndividualVectors(true);
    setShowLinesOfAction(true);
  };

  const handleFieldInputChange = (
    charge: PointCharge2D,
    field: 'q' | 'x' | 'y',
    raw: string
  ) => {
    setDraftInputs((prev) => ({
      ...prev,
      [charge.id]: { ...prev[charge.id], [field]: raw },
    }));
    const parsed = parseLocaleNumber(raw);
    if (!Number.isFinite(parsed)) return;

    if (field === 'q' && parsed >= CHARGE_MIN && parsed <= CHARGE_MAX) {
      updateCharge(charge.id, { q: parsed });
    } else if (field === 'x' && parsed >= COORD_MIN && parsed <= COORD_MAX) {
      updateCharge(charge.id, { x_cm: parsed });
    } else if (field === 'y' && parsed >= COORD_MIN && parsed <= COORD_MAX) {
      updateCharge(charge.id, { y_cm: parsed });
    }
  };

  const handleFieldInputCommit = (charge: PointCharge2D, field: 'q' | 'x' | 'y') => {
    const raw = draftInputs[charge.id]?.[field];
    if (raw === undefined) return;
    const parsed = parseLocaleNumber(raw);
    if (Number.isFinite(parsed)) {
      if (field === 'q') {
        updateCharge(charge.id, { q: clampNumber(parsed, CHARGE_MIN, CHARGE_MAX) });
      } else if (field === 'x') {
        updateCharge(charge.id, { x_cm: clampNumber(parsed, COORD_MIN, COORD_MAX) });
      } else {
        updateCharge(charge.id, { y_cm: clampNumber(parsed, COORD_MIN, COORD_MAX) });
      }
    }
    clearDraftField(charge.id, field);
  };

  const handlePointerDown = (id: string, e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    setSelectedId(id);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore environments without pointer capture
    }
    setDraggingId(id);
  };

  const handlePointerMove = (id: string, e: React.PointerEvent<SVGGElement>) => {
    if (draggingId !== id || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_SIZE;
    const svgY = ((e.clientY - rect.top) / rect.height) * SVG_SIZE;

    const nextX = roundHalf(clampNumber(svgXToCm(svgX), COORD_MIN, COORD_MAX));
    const nextY = roundHalf(clampNumber(svgYToCm(svgY), COORD_MIN, COORD_MAX));

    updateCharge(id, { x_cm: nextX, y_cm: nextY });
    clearDraftField(id, 'x');
    clearDraftField(id, 'y');
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (draggingId) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
      setDraggingId(null);
    }
  };

  // Build Cartesian grid ticks
  const gridSteps = useMemo(() => {
    const arr: number[] = [];
    for (let v = COORD_MIN; v <= COORD_MAX; v += 2) {
      arr.push(v);
    }
    return arr;
  }, []);

  const majorTicks = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

  const targetSvgX = targetCharge ? cmToSvgX(targetCharge.x_cm) : cmToSvgX(0);
  const targetSvgY = targetCharge ? cmToSvgY(targetCharge.y_cm) : cmToSvgY(0);

  // Map source charge IDs to consistent palette indices
  const sourceColorMap = useMemo(() => {
    const map = new Map<string, (typeof VECTOR_PALETTE)[number]>();
    charges.forEach((c, idx) => {
      map.set(c.id, VECTOR_PALETTE[idx % VECTOR_PALETTE.length]);
    });
    return map;
  }, [charges]);

  const netArrow = useMemo(() => {
    if (superposition.netMagnitude <= 0) return null;
    const lenPx = vectorArrowLength2DPx(
      superposition.netMagnitude,
      maxForceMag,
      scaleMode,
      28,
      108
    );
    return buildVectorArrow(
      targetSvgX,
      targetSvgY,
      superposition.netFx,
      superposition.netFy,
      lenPx,
      11
    );
  }, [superposition, maxForceMag, scaleMode, targetSvgX, targetSvgY]);

  const selectedQValue =
    draftInputs[selectedCharge.id]?.q ?? formatNumInput(selectedCharge.q, 2);
  const selectedXValue =
    draftInputs[selectedCharge.id]?.x ?? formatNumInput(selectedCharge.x_cm, 1);
  const selectedYValue =
    draftInputs[selectedCharge.id]?.y ?? formatNumInput(selectedCharge.y_cm, 1);

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-x-hidden bg-white/95 dark:bg-[#16241A]/95 rounded-3xl p-3 sm:p-5 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm ${
        compact ? 'max-w-md' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#ADCA88]/35 dark:border-[#3C5A40]/35 min-w-0">
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm sm:text-base text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] leading-snug break-words">
              Simulador 2D: Ley de Coulomb y Superposición
            </h3>
            <p className="text-[11px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 font-mono tabular-nums break-words">
              k = {(K_COULOMB / 1e9).toFixed(0)} × 10⁹ N·m²/C² · Plano [−20, 20] cm · {charges.length} de {MAX_CHARGES} cargas
            </p>
          </div>
        </div>

        {/* Scale selector (Linear vs Logarithmic) */}
        <div className="flex flex-wrap items-center gap-1 p-1 w-full sm:w-auto rounded-xl bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88]/50 dark:border-[#3C5A40]/50">
          <button
            type="button"
            onClick={() => setScaleMode('logarithmic')}
            aria-pressed={scaleMode === 'logarithmic'}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              scaleMode === 'logarithmic'
                ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
            }`}
          >
            Escala logarítmica
          </button>
          <button
            type="button"
            onClick={() => setScaleMode('linear')}
            aria-pressed={scaleMode === 'linear'}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              scaleMode === 'linear'
                ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]/50'
            }`}
          >
            Escala lineal
          </button>
        </div>
      </div>

      {/* Zero-division / Coincident coordinates alert */}
      {superposition.overlappingPairs.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-[#FFF2EE] dark:bg-[#4A1D28]/80 border border-[#DC2626]/50 dark:border-[#FF8FA3]/50 px-3.5 py-2.5 text-xs text-[#941C2F] dark:text-[#FF9FAE] flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Coincidencia de posición detectada (r = 0 cm)
            </p>
            <p className="text-[#3D121A]/90 dark:text-[#FBE9E4]/90">
              Las cargas{' '}
              {superposition.overlappingPairs
                .map((p) => `${p.aLabel} y ${p.bLabel}`)
                .join(', ')}{' '}
              están en la misma coordenada. Sepáralas arrastrando o editando sus coordenadas (x, y) para evitar división entre cero.
            </p>
          </div>
        </div>
      )}

      {/* Two-zone sandbox layout: stacked on mobile, side-by-side on desktop (lg:) */}
      <div className={compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'}>
        {/* Left Zone (Interactive 2D Stage + Net Force Metrics + Breakdown Table) */}
        <div className={compact ? 'col-span-1 space-y-3 min-w-0 w-full' : 'col-span-1 lg:col-span-7 space-y-3.5 min-w-0 w-full'}>
          {/* Interactive 2D Cartesian Plane */}
          <div className="w-full min-w-0 bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/85 rounded-2xl p-2 sm:p-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-2 text-[11px] text-[#546C37]/85 dark:text-[#CFE3A8]/85">
              <span>Arrastra cualquier carga sobre el plano · Clic para editar</span>
              <span className="font-mono">
                Objetivo: <strong className="text-[#941C2F] dark:text-[#FF9FAE]">{targetCharge?.label}</strong>
              </span>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              role="img"
              aria-label={`Plano cartesiano 2D con ${charges.length} cargas eléctricas. Fuerza neta sobre ${
                targetCharge?.label ?? 'q'
              }: ${formatSci(superposition.netMagnitude, 3)} newtons a ${superposition.netAngleDeg.toFixed(1)} grados.`}
              className="w-full h-auto max-h-[340px] sm:max-h-[420px] mx-auto select-none touch-none block"
            >
              {/* Plot background */}
              <rect
                x={PLOT_PAD}
                y={PLOT_PAD}
                width={PLOT_SIZE}
                height={PLOT_SIZE}
                rx={6}
                className="fill-white/90 dark:fill-[#132016] stroke-[#ADCA88]/60 dark:stroke-[#3C5A40]/70"
                strokeWidth={1.2}
              />

              {/* Cartesian grid lines */}
              <g>
                {gridSteps.map((val) => {
                  const isMajor = val % 5 === 0;
                  const isAxis = val === 0;
                  const gx = cmToSvgX(val);
                  const gy = cmToSvgY(val);
                  return (
                    <g key={val}>
                      {!isAxis && (
                        <>
                          <line
                            x1={gx}
                            y1={PLOT_PAD}
                            x2={gx}
                            y2={PLOT_PAD + PLOT_SIZE}
                            className={
                              isMajor
                                ? 'stroke-[#ADCA88]/55 dark:stroke-[#3C5A40]/60'
                                : 'stroke-[#ADCA88]/22 dark:stroke-[#3C5A40]/25'
                            }
                            strokeWidth={isMajor ? 1 : 0.7}
                          />
                          <line
                            x1={PLOT_PAD}
                            y1={gy}
                            x2={PLOT_PAD + PLOT_SIZE}
                            y2={gy}
                            className={
                              isMajor
                                ? 'stroke-[#ADCA88]/55 dark:stroke-[#3C5A40]/60'
                                : 'stroke-[#ADCA88]/22 dark:stroke-[#3C5A40]/25'
                            }
                            strokeWidth={isMajor ? 1 : 0.7}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Central X and Y axes with arrowheads */}
              <g className="stroke-[#546C37] dark:stroke-[#9CC46B] fill-[#546C37] dark:fill-[#9CC46B]">
                {/* X axis */}
                <line
                  x1={PLOT_PAD}
                  y1={cmToSvgY(0)}
                  x2={PLOT_PAD + PLOT_SIZE + 8}
                  y2={cmToSvgY(0)}
                  strokeWidth={1.6}
                />
                <polygon
                  points={`${PLOT_PAD + PLOT_SIZE + 12},${cmToSvgY(0)} ${PLOT_PAD + PLOT_SIZE + 4},${
                    cmToSvgY(0) - 4
                  } ${PLOT_PAD + PLOT_SIZE + 4},${cmToSvgY(0) + 4}`}
                  stroke="none"
                />
                {/* Y axis */}
                <line
                  x1={cmToSvgX(0)}
                  y1={PLOT_PAD + PLOT_SIZE}
                  x2={cmToSvgX(0)}
                  y2={PLOT_PAD - 8}
                  strokeWidth={1.6}
                />
                <polygon
                  points={`${cmToSvgX(0)},${PLOT_PAD - 12} ${cmToSvgX(0) - 4},${PLOT_PAD - 4} ${
                    cmToSvgX(0) + 4
                  },${PLOT_PAD - 4}`}
                  stroke="none"
                />
              </g>

              {/* Axis labels */}
              <text
                x={PLOT_PAD + PLOT_SIZE + 4}
                y={cmToSvgY(0) - 9}
                textAnchor="end"
                className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
              >
                X (cm)
              </text>
              <text
                x={cmToSvgX(0) + 8}
                y={PLOT_PAD - 12}
                textAnchor="start"
                className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
              >
                Y (cm)
              </text>

              {/* Tick numeric labels along outer left and bottom edges for clean readability */}
              <g className="fill-[#546C37]/85 dark:fill-[#CFE3A8]/85 font-mono text-[10px] tabular-nums">
                {majorTicks.map((val) => {
                  const gx = cmToSvgX(val);
                  const gy = cmToSvgY(val);
                  return (
                    <g key={`tick-${val}`}>
                      <text x={gx} y={PLOT_PAD + PLOT_SIZE + 16} textAnchor="middle">
                        {val}
                      </text>
                      <text x={PLOT_PAD - 8} y={gy + 3.5} textAnchor="end">
                        {val}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={PLOT_PAD + PLOT_SIZE / 2}
                  y={SVG_SIZE - 8}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-[#546C37]/75 dark:fill-[#CFE3A8]/75"
                >
                  Posición x (cm)
                </text>
              </g>

              {/* Dashed lines of action between source charges and target charge */}
              {showLinesOfAction &&
                targetCharge &&
                charges
                  .filter((c) => c.id !== targetCharge.id)
                  .map((src) => {
                    const sx = cmToSvgX(src.x_cm);
                    const sy = cmToSvgY(src.y_cm);
                    const palette = sourceColorMap.get(src.id) ?? VECTOR_PALETTE[0];
                    return (
                      <line
                        key={`loa-${src.id}`}
                        x1={sx}
                        y1={sy}
                        x2={targetSvgX}
                        y2={targetSvgY}
                        stroke={palette.stroke}
                        strokeWidth={1.2}
                        strokeDasharray="4 4"
                        opacity={0.4}
                      />
                    );
                  })}

              {/* Individual Force Vectors on Target Charge */}
              {showIndividualVectors &&
                superposition.contributions.map((contrib) => {
                  if (contrib.overlapping || contrib.magnitude <= 0) return null;
                  const palette = sourceColorMap.get(contrib.sourceId) ?? VECTOR_PALETTE[0];
                  const lenPx = vectorArrowLength2DPx(
                    contrib.magnitude,
                    maxForceMag,
                    scaleMode,
                    22,
                    96
                  );
                  const arrow = buildVectorArrow(
                    targetSvgX,
                    targetSvgY,
                    contrib.fx,
                    contrib.fy,
                    lenPx,
                    8
                  );
                  if (!arrow) return null;
                  const srcIndex = contrib.sourceLabel.replace('q', '');
                  return (
                    <g key={`vec-${contrib.sourceId}`}>
                      <line
                        x1={arrow.x1}
                        y1={arrow.y1}
                        x2={arrow.lineX2}
                        y2={arrow.lineY2}
                        stroke={palette.stroke}
                        strokeWidth={2.5}
                        strokeDasharray="6 3"
                        strokeLinecap="round"
                      />
                      <polygon points={arrow.headPoints} fill={palette.stroke} />
                      <text
                        x={arrow.labelX}
                        y={arrow.labelY}
                        textAnchor="middle"
                        fill={palette.stroke}
                        className="text-[11px] font-bold font-mono"
                      >
                        F{srcIndex}
                      </text>
                    </g>
                  );
                })}

              {/* Resultant Net Force Vector on Target Charge */}
              {netArrow && (
                <g>
                  <line
                    x1={netArrow.x1}
                    y1={netArrow.y1}
                    x2={netArrow.lineX2}
                    y2={netArrow.lineY2}
                    className="stroke-[#15803D] dark:stroke-[#4ADE80]"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={netArrow.headPoints}
                    className="fill-[#15803D] dark:fill-[#4ADE80]"
                  />
                  <rect
                    x={netArrow.labelX - 24}
                    y={netArrow.labelY - 12}
                    width={48}
                    height={17}
                    rx={4}
                    className="fill-white/95 dark:fill-[#0F1A0F]/95 stroke-[#15803D]/60 dark:stroke-[#4ADE80]/60"
                    strokeWidth={1}
                  />
                  <text
                    x={netArrow.labelX}
                    y={netArrow.labelY}
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-[#15803D] dark:fill-[#4ADE80] font-mono"
                  >
                    F⃗neta
                  </text>
                </g>
              )}

              {/* Point Charges (Positive = Red, Negative = Blue, Neutral = Slate) */}
              {charges.map((c) => {
                const cx = cmToSvgX(c.x_cm);
                const cy = cmToSvgY(c.y_cm);
                const isTarget = c.id === activeTargetId;
                const isSelected = c.id === activeSelectedId;
                const isPos = c.q > 0;
                const isNeg = c.q < 0;
                const fill = isPos ? '#DC2626' : isNeg ? '#2563EB' : '#64748B';
                const stroke = isPos ? '#7F1D1D' : isNeg ? '#1E3A8A' : '#334155';
                const sign = isPos ? '+' : isNeg ? '−' : '0';
                const labelY = cy - SPHERE_RADIUS - 7 > PLOT_PAD + 10 ? cy - SPHERE_RADIUS - 7 : cy + SPHERE_RADIUS + 14;

                return (
                  <g
                    key={c.id}
                    onPointerDown={(e) => handlePointerDown(c.id, e)}
                    onPointerMove={(e) => handlePointerMove(c.id, e)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={draggingId === c.id ? 'cursor-grabbing' : 'cursor-grab'}
                  >
                    {/* Invisible generous touch target */}
                    <circle cx={cx} cy={cy} r={TOUCH_RADIUS} fill="transparent" />

                    {/* Target charge halo ring */}
                    {isTarget && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={SPHERE_RADIUS + 6}
                        fill="none"
                        className="stroke-[#15803D] dark:stroke-[#4ADE80]"
                        strokeWidth={2.2}
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Editor-selected highlight ring */}
                    {isSelected && !isTarget && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={SPHERE_RADIUS + 4}
                        fill="none"
                        className="stroke-[#546C37] dark:stroke-[#CFE3A8]"
                        strokeWidth={1.6}
                      />
                    )}

                    {/* Charge sphere */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={SPHERE_RADIUS}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={2}
                    />
                    <text
                      x={cx}
                      y={cy + 5.5}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      className="pointer-events-none"
                    >
                      {sign}
                    </text>

                    {/* Charge tag */}
                    <text
                      x={cx}
                      y={labelY}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-mono tabular-nums pointer-events-none"
                    >
                      {c.label} ({c.q > 0 ? `+${formatNumInput(c.q, 1)}` : formatNumInput(c.q, 1)} {unitLabel(c.unit)})
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Legend & Visibility Toggles */}
            <div className="mt-2 pt-2 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
              <div className="flex flex-wrap items-center gap-3 text-[#546C37] dark:text-[#CFE3A8]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
                  Positiva (+)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block" />
                  Negativa (−)
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#15803D] dark:text-[#4ADE80]">
                  <span className="w-3.5 h-0.5 bg-[#15803D] dark:bg-[#4ADE80] inline-block" />
                  F⃗neta
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[#546C37] dark:text-[#CFE3A8]">
                <label className="min-h-[40px] inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showIndividualVectors}
                    onChange={(e) => setShowIndividualVectors(e.target.checked)}
                    className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer"
                  />
                  <span>Fuerzas individuales</span>
                </label>
                <label className="min-h-[40px] inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLinesOfAction}
                    onChange={(e) => setShowLinesOfAction(e.target.checked)}
                    className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer"
                  />
                  <span>Líneas de acción</span>
                </label>
              </div>
            </div>
          </div>

          {/* Net Force Vector Summary (4-metric strip) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
            <div className="min-w-0 rounded-2xl px-3 py-2.5 bg-[#ECFDF5] dark:bg-[#12332F]/80 border border-[#15803D]/35 dark:border-[#4ADE80]/35">
              <span className="block text-[10px] font-mono text-[#15803D] dark:text-[#4ADE80]">
                Magnitud |F⃗neta|
              </span>
              <span className="block text-xs sm:text-sm font-bold font-mono tabular-nums text-[#15803D] dark:text-[#4ADE80] mt-0.5 break-words">
                {superposition.netMagnitude === 0 ? '0 N' : `${formatSci(superposition.netMagnitude, 3)} N`}
              </span>
              <span className="block text-[10px] font-mono tabular-nums text-[#3D121A]/75 dark:text-[#FBE9E4]/75 break-words">
                ≈ {formatForceEngineering(superposition.netMagnitude)}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl px-3 py-2.5 bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88]/45 dark:border-[#3C5A40]/45">
              <span className="block text-[10px] font-mono text-[#546C37]/80 dark:text-[#CFE3A8]/80">
                Ángulo θ (desde +X)
              </span>
              <span className="block text-xs sm:text-sm font-bold font-mono tabular-nums text-[#546C37] dark:text-[#CFE3A8] mt-0.5 break-words">
                {superposition.netMagnitude === 0 ? '—' : `${superposition.netAngleDeg.toFixed(1)}°`}
              </span>
              <span className="block text-[10px] text-[#546C37]/70 dark:text-[#CFE3A8]/70">
                {superposition.netMagnitude === 0 ? 'Fuerza nula' : 'Antihorario'}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl px-3 py-2.5 bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88]/45 dark:border-[#3C5A40]/45">
              <span className="block text-[10px] font-mono text-[#546C37]/80 dark:text-[#CFE3A8]/80">
                Componente Fx
              </span>
              <span className="block text-xs sm:text-sm font-bold font-mono tabular-nums text-[#3D121A] dark:text-[#FBE9E4] mt-0.5 break-words">
                {superposition.netFx === 0 ? '0 N' : `${formatSci(superposition.netFx, 3)} N`}
              </span>
              <span className="block text-[10px] font-mono tabular-nums text-[#546C37]/70 dark:text-[#CFE3A8]/70">
                Eje X
              </span>
            </div>

            <div className="min-w-0 rounded-2xl px-3 py-2.5 bg-[#FFFBD9] dark:bg-[#0F1A0F] border border-[#ADCA88]/45 dark:border-[#3C5A40]/45">
              <span className="block text-[10px] font-mono text-[#546C37]/80 dark:text-[#CFE3A8]/80">
                Componente Fy
              </span>
              <span className="block text-xs sm:text-sm font-bold font-mono tabular-nums text-[#3D121A] dark:text-[#FBE9E4] mt-0.5 break-words">
                {superposition.netFy === 0 ? '0 N' : `${formatSci(superposition.netFy, 3)} N`}
              </span>
              <span className="block text-[10px] font-mono tabular-nums text-[#546C37]/70 dark:text-[#CFE3A8]/70">
                Eje Y
              </span>
            </div>
          </div>

          {/* Individual Contributions & Superposition Breakdown Table */}
          <div className="w-full max-w-full min-w-0 bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 rounded-2xl border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono tabular-nums">
              <thead>
                <tr className="border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40 text-[#546C37] dark:text-[#CFE3A8]">
                  <th className="py-2 px-2.5 font-bold">Fuerza sobre {targetCharge?.label}</th>
                  <th className="py-2 px-2 font-bold">r (cm)</th>
                  <th className="py-2 px-2 font-bold">Fx (N)</th>
                  <th className="py-2 px-2 font-bold">Fy (N)</th>
                  <th className="py-2 px-2.5 font-bold text-right">|F| (N)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ADCA88]/25 dark:divide-[#3C5A40]/25 text-[#3D121A] dark:text-[#FBE9E4]">
                {superposition.contributions.map((c) => {
                  const palette = sourceColorMap.get(c.sourceId) ?? VECTOR_PALETTE[0];
                  const natureText = c.overlapping
                    ? 'r = 0 (superpuesta)'
                    : c.nature === 'repulsiva'
                      ? 'Repulsiva'
                      : c.nature === 'atractiva'
                        ? 'Atractiva'
                        : 'Nula';
                  return (
                    <tr key={`row-${c.sourceId}`}>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className={`font-bold ${palette.textClass}`}>
                          {c.sourceLabel} → {targetCharge?.label}
                        </span>
                        <span className="block text-[10px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 font-sans">
                          {natureText}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {c.overlapping ? '0' : (c.r_m * 100).toFixed(1)}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {c.overlapping ? '—' : c.fx === 0 ? '0' : formatSci(c.fx, 2)}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {c.overlapping ? '—' : c.fy === 0 ? '0' : formatSci(c.fy, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-semibold">
                        {c.overlapping ? '—' : c.magnitude === 0 ? '0' : formatSci(c.magnitude, 2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#D6E3B1]/45 dark:bg-[#1E3323]/80 font-bold text-[#15803D] dark:text-[#4ADE80]">
                  <td className="py-2 px-2.5 whitespace-nowrap" colSpan={2}>
                    Σ F⃗neta ({targetCharge?.label})
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    {superposition.netFx === 0 ? '0' : formatSci(superposition.netFx, 3)}
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    {superposition.netFy === 0 ? '0' : formatSci(superposition.netFy, 3)}
                  </td>
                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                    {superposition.netMagnitude === 0 ? '0' : formatSci(superposition.netMagnitude, 3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Zone (Dynamic Charge Manager & Active Charge Controls) */}
        <div
          className={`w-full min-w-0 bg-[#FFFBD9]/55 dark:bg-[#0F1A0F]/65 rounded-2xl p-3 sm:p-3.5 border border-[#ADCA88]/35 dark:border-[#3C5A40]/35 space-y-4 ${
            compact ? 'col-span-1' : 'col-span-1 lg:col-span-5'
          }`}
        >
          {/* Target Charge Selector */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8] flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80] shrink-0" />
                Carga objetivo (q_obj)
              </span>
              <span className="text-[11px] font-mono text-[#546C37]/75 dark:text-[#CFE3A8]/75">
                Fuerza neta sobre
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {charges.map((c) => {
                const isTarget = c.id === activeTargetId;
                return (
                  <button
                    key={`target-${c.id}`}
                    type="button"
                    onClick={() => {
                      setTargetId(c.id);
                      setSelectedId(c.id);
                    }}
                    aria-pressed={isTarget}
                    className={`min-h-[40px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                      isTarget
                        ? 'bg-[#15803D] dark:bg-[#2E7D32] text-white shadow-xs'
                        : 'bg-white dark:bg-[#16241A] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/60 dark:border-[#3C5A40]/60 hover:bg-[#D6E3B1]/60 dark:hover:bg-[#24402B]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Charge List (2–5 charges) */}
          <div className="space-y-2 pt-2 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8]">
                Cargas activas ({charges.length}/{MAX_CHARGES})
              </span>
              <button
                type="button"
                onClick={handleAddCharge}
                disabled={charges.length >= MAX_CHARGES}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#546C37]/90 dark:hover:bg-[#6E8F47]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
              >
                + Agregar carga
              </button>
            </div>

            <div className="space-y-1.5">
              {charges.map((c) => {
                const isSelected = c.id === activeSelectedId;
                const isTarget = c.id === activeTargetId;
                const signColor =
                  c.q > 0
                    ? 'bg-[#DC2626] text-white'
                    : c.q < 0
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-400 text-white';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(c.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors cursor-pointer min-w-0 ${
                      isSelected
                        ? 'bg-white dark:bg-[#16241A] border-[#546C37] dark:border-[#8FB35E] shadow-xs'
                        : 'bg-white/60 dark:bg-[#16241A]/50 border-[#ADCA88]/40 dark:border-[#3C5A40]/40 hover:bg-white dark:hover:bg-[#16241A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${signColor}`}
                      >
                        {c.q > 0 ? '+' : c.q < 0 ? '−' : '0'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-bold font-mono text-[#3D121A] dark:text-[#FBE9E4]">
                          <span>{c.label}</span>
                          <span>=</span>
                          <span className="tabular-nums">
                            {c.q > 0 ? `+${formatNumInput(c.q, 1)}` : formatNumInput(c.q, 1)} {unitLabel(c.unit)}
                          </span>
                          {isTarget && (
                            <span className="text-[10px] font-sans font-semibold text-[#15803D] dark:text-[#4ADE80]">
                              · Objetivo
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] font-mono tabular-nums text-[#546C37]/80 dark:text-[#CFE3A8]/80 truncate">
                          ({formatNumInput(c.x_cm, 1)} cm, {formatNumInput(c.y_cm, 1)} cm)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isTarget && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetId(c.id);
                            setSelectedId(c.id);
                          }}
                          title={`Seleccionar ${c.label} como carga objetivo`}
                          className="min-h-[40px] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B] transition-colors cursor-pointer"
                        >
                          Objetivo
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={charges.length <= MIN_CHARGES}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCharge(c.id);
                        }}
                        title={
                          charges.length <= MIN_CHARGES
                            ? 'Se requieren al menos 2 cargas activas'
                            : `Eliminar ${c.label}`
                        }
                        aria-label={`Eliminar carga ${c.label}`}
                        className="min-h-[40px] min-w-[40px] p-2 rounded-lg text-[#941C2F] dark:text-[#FF9FAE] hover:bg-[#FFF2EE] dark:hover:bg-[#4A1D28] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Charge Detailed Controls (Direct Numeric Inputs + Sliders) */}
          {selectedCharge && (
            <div className="space-y-3 pt-3 border-t border-[#ADCA88]/35 dark:border-[#3C5A40]/35">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8]">
                  Editar {selectedCharge.label}
                </span>

                {/* Unit toggle per charge: nC vs µC */}
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#16241A] border border-[#ADCA88]/60 dark:border-[#3C5A40]/60">
                  {(['nC', 'uC'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => updateCharge(selectedCharge.id, { unit })}
                      aria-pressed={selectedCharge.unit === unit}
                      className={`min-h-[40px] min-w-[44px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedCharge.unit === unit
                          ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white'
                          : 'text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/50 dark:hover:bg-[#24402B]'
                      }`}
                    >
                      {unitLabel(unit)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Magnitude & sign q */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label htmlFor="coulomb-q-slider" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                    Carga ({selectedCharge.label})
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="coulomb-q-input"
                      type="number"
                      inputMode="decimal"
                      min={CHARGE_MIN}
                      max={CHARGE_MAX}
                      step="any"
                      value={selectedQValue}
                      onChange={(e) => handleFieldInputChange(selectedCharge, 'q', e.target.value)}
                      onBlur={() => handleFieldInputCommit(selectedCharge, 'q')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFieldInputCommit(selectedCharge, 'q');
                      }}
                      aria-label={`Magnitud y signo de ${selectedCharge.label} en ${unitLabel(selectedCharge.unit)}`}
                      className="w-20 min-h-[40px] px-2 py-1 text-right text-xs font-bold font-mono tabular-nums rounded-lg bg-white dark:bg-[#16241A] text-[#3D121A] dark:text-[#FBE9E4] border border-[#ADCA88] dark:border-[#3C5A40] focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#8FB35E]"
                    />
                    <span className="font-bold text-xs font-mono text-[#546C37] dark:text-[#CFE3A8] w-6">
                      {unitLabel(selectedCharge.unit)}
                    </span>
                  </div>
                </div>
                <input
                  id="coulomb-q-slider"
                  type="range"
                  min={CHARGE_MIN}
                  max={CHARGE_MAX}
                  step={0.5}
                  value={selectedCharge.q}
                  onChange={(e) => {
                    updateCharge(selectedCharge.id, { q: Number(e.target.value) });
                    clearDraftField(selectedCharge.id, 'q');
                  }}
                  aria-label={`Deslizador de magnitud para ${selectedCharge.label}`}
                  className={`w-full h-9 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37] ${
                    selectedCharge.q >= 0 ? 'accent-[#DC2626]' : 'accent-[#2563EB]'
                  }`}
                />
                <div className="flex justify-between text-[10px] font-mono text-[#546C37]/70 dark:text-[#CFE3A8]/70">
                  <span>{CHARGE_MIN} {unitLabel(selectedCharge.unit)}</span>
                  <span>0</span>
                  <span>+{CHARGE_MAX} {unitLabel(selectedCharge.unit)}</span>
                </div>
              </div>

              {/* Position X (cm) */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label htmlFor="coulomb-x-slider" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                    Posición X
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="coulomb-x-input"
                      type="number"
                      inputMode="decimal"
                      min={COORD_MIN}
                      max={COORD_MAX}
                      step="any"
                      value={selectedXValue}
                      onChange={(e) => handleFieldInputChange(selectedCharge, 'x', e.target.value)}
                      onBlur={() => handleFieldInputCommit(selectedCharge, 'x')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFieldInputCommit(selectedCharge, 'x');
                      }}
                      aria-label={`Coordenada X de ${selectedCharge.label} en centímetros`}
                      className="w-20 min-h-[40px] px-2 py-1 text-right text-xs font-bold font-mono tabular-nums rounded-lg bg-white dark:bg-[#16241A] text-[#3D121A] dark:text-[#FBE9E4] border border-[#ADCA88] dark:border-[#3C5A40] focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#8FB35E]"
                    />
                    <span className="font-bold text-xs font-mono text-[#546C37] dark:text-[#CFE3A8] w-6">
                      cm
                    </span>
                  </div>
                </div>
                <input
                  id="coulomb-x-slider"
                  type="range"
                  min={COORD_MIN}
                  max={COORD_MAX}
                  step={0.5}
                  value={selectedCharge.x_cm}
                  onChange={(e) => {
                    updateCharge(selectedCharge.id, { x_cm: Number(e.target.value) });
                    clearDraftField(selectedCharge.id, 'x');
                  }}
                  aria-label={`Deslizador de coordenada X para ${selectedCharge.label}`}
                  className="w-full h-9 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
                />
              </div>

              {/* Position Y (cm) */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label htmlFor="coulomb-y-slider" className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                    Posición Y
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="coulomb-y-input"
                      type="number"
                      inputMode="decimal"
                      min={COORD_MIN}
                      max={COORD_MAX}
                      step="any"
                      value={selectedYValue}
                      onChange={(e) => handleFieldInputChange(selectedCharge, 'y', e.target.value)}
                      onBlur={() => handleFieldInputCommit(selectedCharge, 'y')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFieldInputCommit(selectedCharge, 'y');
                      }}
                      aria-label={`Coordenada Y de ${selectedCharge.label} en centímetros`}
                      className="w-20 min-h-[40px] px-2 py-1 text-right text-xs font-bold font-mono tabular-nums rounded-lg bg-white dark:bg-[#16241A] text-[#3D121A] dark:text-[#FBE9E4] border border-[#ADCA88] dark:border-[#3C5A40] focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#8FB35E]"
                    />
                    <span className="font-bold text-xs font-mono text-[#546C37] dark:text-[#CFE3A8] w-6">
                      cm
                    </span>
                  </div>
                </div>
                <input
                  id="coulomb-y-slider"
                  type="range"
                  min={COORD_MIN}
                  max={COORD_MAX}
                  step={0.5}
                  value={selectedCharge.y_cm}
                  onChange={(e) => {
                    updateCharge(selectedCharge.id, { y_cm: Number(e.target.value) });
                    clearDraftField(selectedCharge.id, 'y');
                  }}
                  aria-label={`Deslizador de coordenada Y para ${selectedCharge.label}`}
                  className="w-full h-9 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#546C37]/70 dark:text-[#CFE3A8]/70">
                  <span>{COORD_MIN} cm</span>
                  <span>0 cm</span>
                  <span>+{COORD_MAX} cm</span>
                </div>
              </div>
            </div>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[44px] py-2 px-4 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
