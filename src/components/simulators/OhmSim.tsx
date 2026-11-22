import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Info, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { SIM_SPECS } from '../../data/simulations';
import { SimulationAdjustment } from '../../types';
import { formatSci, formatSig } from '../../utils/format';
import {
  CircuitTopology,
  OHM_RESISTANCE_MAX,
  OHM_RESISTANCE_MIN,
  OHM_VOLTAGE_MAX,
  OHM_VOLTAGE_MIN,
  ResistorInput,
  flowArrowScale,
  flowSpeedPxPerS,
  solveOhmCircuit,
} from '../../utils/physics/ohm';

export interface OhmSimProps {
  initialParams?: Partial<{ v: number; res: number }>;
  adjusted?: SimulationAdjustment[];
  compact?: boolean;
}

interface ResistorDraft {
  id: string;
  value: number;
  input: string;
}

interface FlowSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  current_A: number;
  spacing?: number;
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 340;
const BATTERY_X = 98;
const SUBSCRIPTS = ['₁', '₂', '₃', '₄'];

const DEFAULT_VOLTAGE_V = 12;
const SERIES_DEFAULTS = [4, 6, 12, 10];
const PARALLEL_DEFAULTS = [6, 3, 6, 12];
const MIXED_DEFAULTS = [4, 6, 3];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getUnitForKey(key: string): string {
  const found = SIM_SPECS.ohm.find((s) => s.key === key);
  return found?.unit ?? '';
}

function formatInputValue(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(maxDecimals)));
}

function parseLocaleNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function formatMeasure(value: number, unit: string): string {
  if (!Number.isFinite(value) || value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  if (abs >= 0.01 && abs < 10000) {
    return `${formatSig(value, 3)} ${unit}`;
  }
  return `${formatSci(value, 3)} ${unit}`;
}

function formatCurrentA(i_A: number): string {
  if (!Number.isFinite(i_A) || i_A === 0) return '0 A';
  const abs = Math.abs(i_A);
  if (abs >= 0.001 && abs < 10000) {
    return `${formatSig(i_A, 3)} A`;
  }
  return `${formatSci(i_A, 3)} A`;
}

function formatCurrentmA(i_A: number): string {
  const mA = i_A * 1000;
  if (!Number.isFinite(mA) || mA === 0) return '0 mA';
  const abs = Math.abs(mA);
  if (abs >= 0.01 && abs < 1000000) {
    return `${formatSig(mA, 3)} mA`;
  }
  return `${formatSci(mA, 3)} mA`;
}

function formatCompactCurrent(i_A: number): string {
  if (!Number.isFinite(i_A) || i_A === 0) return '0 A';
  if (Math.abs(i_A) >= 0.1) return `${formatSig(i_A, 3)} A`;
  return `${formatSig(i_A * 1000, 3)} mA`;
}

function makeDrafts(values: number[], prefix: string): ResistorDraft[] {
  return values.map((val, idx) => ({
    id: `${prefix}-${idx + 1}`,
    value: val,
    input: formatInputValue(val, 2),
  }));
}

function HorizontalResistorZigzag({ cx, cy }: { cx: number; cy: number }) {
  // Spans cx - 32 to cx + 32 (width 64)
  const pts = [
    `${cx - 32},${cy}`,
    `${cx - 26},${cy}`,
    `${cx - 21},${cy - 10}`,
    `${cx - 12},${cy + 10}`,
    `${cx - 3},${cy - 10}`,
    `${cx + 6},${cy + 10}`,
    `${cx + 15},${cy - 10}`,
    `${cx + 23},${cy + 10}`,
    `${cx + 27},${cy}`,
    `${cx + 32},${cy}`,
  ].join(' ');

  return (
    <g>
      <rect
        x={cx - 34}
        y={cy - 14}
        width={68}
        height={28}
        rx={6}
        className="fill-[#FFFBD9] dark:fill-[#16241A] stroke-[#ADCA88]/75 dark:stroke-[#3C5A40]/75"
        strokeWidth={1.3}
      />
      <polyline
        points={pts}
        fill="none"
        className="stroke-[#3D121A] dark:stroke-[#FBE9E4]"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function VerticalResistorZigzag({ cx, cy }: { cx: number; cy: number }) {
  // Spans cy - 34 to cy + 34 (height 68)
  const pts = [
    `${cx},${cy - 34}`,
    `${cx},${cy - 27}`,
    `${cx - 10},${cy - 21}`,
    `${cx + 10},${cy - 12}`,
    `${cx - 10},${cy - 3}`,
    `${cx + 10},${cy + 6}`,
    `${cx - 10},${cy + 15}`,
    `${cx + 10},${cy + 23}`,
    `${cx},${cy + 28}`,
    `${cx},${cy + 34}`,
  ].join(' ');

  return (
    <g>
      <rect
        x={cx - 14}
        y={cy - 36}
        width={28}
        height={72}
        rx={6}
        className="fill-[#FFFBD9] dark:fill-[#16241A] stroke-[#ADCA88]/75 dark:stroke-[#3C5A40]/75"
        strokeWidth={1.3}
      />
      <polyline
        points={pts}
        fill="none"
        className="stroke-[#3D121A] dark:stroke-[#FBE9E4]"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function VoltageSourceGlyph({
  x,
  cy,
  voltageDisplay,
  showValues,
}: {
  x: number;
  cy: number;
  voltageDisplay: string;
  showValues: boolean;
}) {
  return (
    <g>
      <rect
        x={x - 22}
        y={cy - 24}
        width={44}
        height={48}
        rx={8}
        className="fill-[#FFFBD9] dark:fill-[#16241A] stroke-[#ADCA88]/80 dark:stroke-[#3C5A40]/80"
        strokeWidth={1.5}
      />
      {/* Wire stubs */}
      <line
        x1={x}
        y1={cy - 24}
        x2={x}
        y2={cy - 9}
        className="stroke-[#546C37] dark:stroke-[#8FB35E]"
        strokeWidth={3}
      />
      <line
        x1={x}
        y1={cy + 9}
        x2={x}
        y2={cy + 24}
        className="stroke-[#546C37] dark:stroke-[#8FB35E]"
        strokeWidth={3}
      />
      {/* Long positive plate */}
      <line
        x1={x - 16}
        y1={cy - 9}
        x2={x + 16}
        y2={cy - 9}
        stroke="#941C2F"
        className="dark:stroke-[#FF9FAE]"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Short negative plate */}
      <line
        x1={x - 9}
        y1={cy + 9}
        x2={x + 9}
        y2={cy + 9}
        className="stroke-[#3D121A] dark:stroke-[#CFE3A8]"
        strokeWidth={3.8}
        strokeLinecap="round"
      />
      <text
        x={x + 26}
        y={cy - 6}
        fontSize="13"
        fontWeight="bold"
        className="fill-[#941C2F] dark:fill-[#FF9FAE]"
      >
        +
      </text>
      <text
        x={x + 26}
        y={cy + 15}
        fontSize="14"
        fontWeight="bold"
        className="fill-[#3D121A] dark:fill-[#CFE3A8]"
      >
        −
      </text>
      {showValues && (
        <g>
          <text
            x={x - 28}
            y={cy - 2}
            textAnchor="end"
            className="text-[11px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-['Space_Grotesk']"
          >
            Fuente
          </text>
          <text
            x={x - 28}
            y={cy + 13}
            textAnchor="end"
            className="text-[12px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
          >
            {voltageDisplay} V
          </text>
        </g>
      )}
    </g>
  );
}

export const OhmSim: React.FC<OhmSimProps> = ({
  initialParams,
  adjusted,
  compact = false,
}) => {
  const initialVoltage = useMemo(() => {
    if (typeof initialParams?.v === 'number' && Number.isFinite(initialParams.v)) {
      return clamp(initialParams.v, OHM_VOLTAGE_MIN, OHM_VOLTAGE_MAX);
    }
    return DEFAULT_VOLTAGE_V;
  }, [initialParams?.v]);

  const initialSeriesValues = useMemo(() => {
    if (typeof initialParams?.res === 'number' && Number.isFinite(initialParams.res)) {
      return [clamp(initialParams.res, OHM_RESISTANCE_MIN, OHM_RESISTANCE_MAX)];
    }
    return [SERIES_DEFAULTS[0], SERIES_DEFAULTS[1]];
  }, [initialParams?.res]);

  const [topology, setTopology] = useState<CircuitTopology>('series');
  const [voltage, setVoltage] = useState<number>(initialVoltage);
  const [voltageInput, setVoltageInput] = useState<string>(formatInputValue(initialVoltage, 2));

  const [seriesResistors, setSeriesResistors] = useState<ResistorDraft[]>(() =>
    makeDrafts(initialSeriesValues, 's')
  );
  const [parallelResistors, setParallelResistors] = useState<ResistorDraft[]>(() =>
    makeDrafts([PARALLEL_DEFAULTS[0], PARALLEL_DEFAULTS[1]], 'p')
  );
  const [mixedResistors, setMixedResistors] = useState<ResistorDraft[]>(() =>
    makeDrafts(MIXED_DEFAULTS, 'm')
  );

  const [showValues, setShowValues] = useState<boolean>(true);
  const [showCurrentArrows, setShowCurrentArrows] = useState<boolean>(true);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const lastFrameRef = useRef<number | null>(null);
  const nextIdCounterRef = useRef<number>(10);

  useEffect(() => {
    setVoltage(initialVoltage);
    setVoltageInput(formatInputValue(initialVoltage, 2));
  }, [initialVoltage]);

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

  const activeDrafts =
    topology === 'series'
      ? seriesResistors
      : topology === 'parallel'
        ? parallelResistors
        : mixedResistors;

  const setActiveDrafts =
    topology === 'series'
      ? setSeriesResistors
      : topology === 'parallel'
        ? setParallelResistors
        : setMixedResistors;

  const resistorInputs: ResistorInput[] = useMemo(
    () =>
      activeDrafts.map((d, idx) => ({
        id: d.id,
        label: `R${SUBSCRIPTS[idx] ?? String(idx + 1)}`,
        resistance: d.value,
      })),
    [activeDrafts]
  );

  const analysis = useMemo(
    () => solveOhmCircuit(topology, voltage, resistorInputs),
    [topology, voltage, resistorInputs]
  );

  useEffect(() => {
    if (!showCurrentArrows || prefersReducedMotion || analysis.totalCurrent_A <= 0) {
      lastFrameRef.current = null;
      return;
    }

    let rafId = 0;
    const step = (timestamp: number) => {
      if (lastFrameRef.current !== null) {
        const dt = Math.min(0.05, Math.max(0, (timestamp - lastFrameRef.current) / 1000));
        setElapsedSec((prev) => (prev + dt) % 100000);
      }
      lastFrameRef.current = timestamp;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      lastFrameRef.current = null;
    };
  }, [showCurrentArrows, prefersReducedMotion, analysis.totalCurrent_A]);

  // Handlers: Voltage
  const handleVoltageSlider = (nextV: number) => {
    const clamped = clamp(nextV, OHM_VOLTAGE_MIN, OHM_VOLTAGE_MAX);
    setVoltage(clamped);
    setVoltageInput(formatInputValue(clamped, 2));
  };

  const handleVoltageInputChange = (raw: string) => {
    setVoltageInput(raw);
    const parsed = parseLocaleNumber(raw);
    if (Number.isFinite(parsed) && parsed >= OHM_VOLTAGE_MIN && parsed <= OHM_VOLTAGE_MAX) {
      setVoltage(parsed);
    }
  };

  const handleVoltageInputCommit = () => {
    const parsed = parseLocaleNumber(voltageInput);
    const clamped = Number.isFinite(parsed)
      ? clamp(parsed, OHM_VOLTAGE_MIN, OHM_VOLTAGE_MAX)
      : voltage;
    setVoltage(clamped);
    setVoltageInput(formatInputValue(clamped, 2));
  };

  // Handlers: Resistors
  const handleResistorSlider = (id: string, nextVal: number) => {
    const clamped = clamp(nextVal, OHM_RESISTANCE_MIN, OHM_RESISTANCE_MAX);
    setActiveDrafts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, value: clamped, input: formatInputValue(clamped, 2) } : r))
    );
  };

  const handleResistorInputChange = (id: string, raw: string) => {
    const parsed = parseLocaleNumber(raw);
    setActiveDrafts((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (Number.isFinite(parsed) && parsed >= OHM_RESISTANCE_MIN && parsed <= OHM_RESISTANCE_MAX) {
          return { ...r, value: parsed, input: raw };
        }
        return { ...r, input: raw };
      })
    );
  };

  const handleResistorInputCommit = (id: string) => {
    setActiveDrafts((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const parsed = parseLocaleNumber(r.input);
        const clamped = Number.isFinite(parsed)
          ? clamp(parsed, OHM_RESISTANCE_MIN, OHM_RESISTANCE_MAX)
          : r.value;
        return { ...r, value: clamped, input: formatInputValue(clamped, 2) };
      })
    );
  };

  const canAddResistor =
    (topology === 'series' && seriesResistors.length < 4) ||
    (topology === 'parallel' && parallelResistors.length < 4);

  const canRemoveResistor =
    (topology === 'series' && seriesResistors.length > 1) ||
    (topology === 'parallel' && parallelResistors.length > 2);

  const handleAddResistor = () => {
    if (!canAddResistor) return;
    nextIdCounterRef.current += 1;
    if (topology === 'series') {
      const defaultVal = SERIES_DEFAULTS[seriesResistors.length] ?? 10;
      setSeriesResistors((prev) => [
        ...prev,
        { id: `s-${nextIdCounterRef.current}`, value: defaultVal, input: String(defaultVal) },
      ]);
    } else if (topology === 'parallel') {
      const defaultVal = PARALLEL_DEFAULTS[parallelResistors.length] ?? 12;
      setParallelResistors((prev) => [
        ...prev,
        { id: `p-${nextIdCounterRef.current}`, value: defaultVal, input: String(defaultVal) },
      ]);
    }
  };

  const handleRemoveResistor = (id: string) => {
    if (!canRemoveResistor) return;
    setActiveDrafts((prev) => prev.filter((r) => r.id !== id));
  };

  const handleReset = () => {
    setVoltage(initialVoltage);
    setVoltageInput(formatInputValue(initialVoltage, 2));
    if (topology === 'series') {
      setSeriesResistors(makeDrafts(initialSeriesValues, 's'));
    } else if (topology === 'parallel') {
      setParallelResistors(makeDrafts([PARALLEL_DEFAULTS[0], PARALLEL_DEFAULTS[1]], 'p'));
    } else {
      setMixedResistors(makeDrafts(MIXED_DEFAULTS, 'm'));
    }
    setElapsedSec(0);
  };

  // Build flow segments for animated arrows based on topology
  const { seriesCenters, parallelBranchXs, flowSegments } = useMemo(() => {
    const segs: FlowSegment[] = [];
    const totalI = analysis.totalCurrent_A;

    if (topology === 'series') {
      const n = analysis.resistors.length;
      const centersByCount: Record<number, number[]> = {
        1: [344],
        2: [246, 442],
        3: [200, 344, 488],
        4: [176, 288, 400, 512],
      };
      const centers = centersByCount[n] ?? [344];
      const topY = 76;
      const botY = 264;
      const rightX = 584;

      // Left upward from battery to top
      segs.push({ id: 's-left-up', x1: BATTERY_X, y1: 146, x2: BATTERY_X, y2: topY, current_A: totalI, spacing: 46 });
      // Top segments between resistors
      let prevX = BATTERY_X;
      centers.forEach((cx, idx) => {
        const segEnd = cx - 34;
        if (segEnd - prevX >= 22) {
          segs.push({ id: `s-top-${idx}`, x1: prevX, y1: topY, x2: segEnd, y2: topY, current_A: totalI, spacing: 50 });
        }
        prevX = cx + 34;
      });
      if (rightX - prevX >= 22) {
        segs.push({ id: 's-top-end', x1: prevX, y1: topY, x2: rightX, y2: topY, current_A: totalI, spacing: 50 });
      }
      // Right downward
      segs.push({ id: 's-right-down', x1: rightX, y1: topY, x2: rightX, y2: botY, current_A: totalI, spacing: 54 });
      // Bottom return right-to-left
      segs.push({ id: 's-bot-ret', x1: rightX, y1: botY, x2: BATTERY_X, y2: botY, current_A: totalI, spacing: 62 });
      // Left upward from bottom to battery
      segs.push({ id: 's-left-bot', x1: BATTERY_X, y1: botY, x2: BATTERY_X, y2: 194, current_A: totalI, spacing: 46 });

      return { seriesCenters: centers, parallelBranchXs: [] as number[], flowSegments: segs };
    }

    if (topology === 'parallel') {
      const n = analysis.resistors.length;
      const branchesByCount: Record<number, number[]> = {
        2: [265, 455],
        3: [220, 368, 516],
        4: [195, 305, 415, 525],
      };
      const branchXs = branchesByCount[n] ?? [265, 455];
      const topY = 68;
      const botY = 272;

      // Left trunk up from battery
      segs.push({ id: 'p-left-up', x1: BATTERY_X, y1: 146, x2: BATTERY_X, y2: topY, current_A: totalI, spacing: 46 });
      // Left trunk from bottom to battery
      segs.push({ id: 'p-left-bot', x1: BATTERY_X, y1: botY, x2: BATTERY_X, y2: 194, current_A: totalI, spacing: 46 });

      // Top & bottom bus segments with exact Kirchhoff remaining current
      let remainingI = totalI;
      let prevX = BATTERY_X;
      branchXs.forEach((bx, idx) => {
        segs.push({ id: `p-top-bus-${idx}`, x1: prevX, y1: topY, x2: bx, y2: topY, current_A: remainingI, spacing: 54 });
        segs.push({ id: `p-bot-bus-${idx}`, x1: bx, y1: botY, x2: prevX, y2: botY, current_A: remainingI, spacing: 54 });

        const branchI = analysis.resistors[idx]?.current_A ?? 0;
        segs.push({ id: `p-br-up-${idx}`, x1: bx, y1: topY, x2: bx, y2: 134, current_A: branchI, spacing: 44 });
        segs.push({ id: `p-br-dn-${idx}`, x1: bx, y1: 206, x2: bx, y2: botY, current_A: branchI, spacing: 44 });

        remainingI = Math.max(0, remainingI - branchI);
        prevX = bx;
      });

      return { seriesCenters: [] as number[], parallelBranchXs: branchXs, flowSegments: segs };
    }

    // Mixed topology: R1 in series on top (x=224), node A at (350,76), R2 at x=350, R3 at x=515, node B at (350,264)
    const topY = 76;
    const botY = 264;
    const nodeX = 350;
    const branch3X = 515;
    const i1 = analysis.resistors[0]?.current_A ?? totalI;
    const i2 = analysis.resistors[1]?.current_A ?? 0;
    const i3 = analysis.resistors[2]?.current_A ?? 0;

    // Trunk & R1 (I1 = Itotal)
    segs.push({ id: 'm-left-up', x1: BATTERY_X, y1: 146, x2: BATTERY_X, y2: topY, current_A: i1, spacing: 46 });
    segs.push({ id: 'm-r1-pre', x1: BATTERY_X, y1: topY, x2: 190, y2: topY, current_A: i1, spacing: 48 });
    segs.push({ id: 'm-r1-post', x1: 258, y1: topY, x2: nodeX, y2: topY, current_A: i1, spacing: 48 });
    segs.push({ id: 'm-bot-main', x1: nodeX, y1: botY, x2: BATTERY_X, y2: botY, current_A: i1, spacing: 58 });
    segs.push({ id: 'm-left-bot', x1: BATTERY_X, y1: botY, x2: BATTERY_X, y2: 194, current_A: i1, spacing: 46 });

    // Branch R2 (I2)
    segs.push({ id: 'm-r2-up', x1: nodeX, y1: topY, x2: nodeX, y2: 134, current_A: i2, spacing: 42 });
    segs.push({ id: 'm-r2-dn', x1: nodeX, y1: 206, x2: nodeX, y2: botY, current_A: i2, spacing: 42 });

    // Branch R3 (I3)
    segs.push({ id: 'm-r3-top', x1: nodeX, y1: topY, x2: branch3X, y2: topY, current_A: i3, spacing: 54 });
    segs.push({ id: 'm-r3-up', x1: branch3X, y1: topY, x2: branch3X, y2: 134, current_A: i3, spacing: 42 });
    segs.push({ id: 'm-r3-dn', x1: branch3X, y1: 206, x2: branch3X, y2: botY, current_A: i3, spacing: 42 });
    segs.push({ id: 'm-r3-bot', x1: branch3X, y1: botY, x2: nodeX, y2: botY, current_A: i3, spacing: 54 });

    return { seriesCenters: [] as number[], parallelBranchXs: [] as number[], flowSegments: segs };
  }, [topology, analysis]);

  const voltageDisplay = formatInputValue(voltage, 2);
  const reqDisplay = formatMeasure(analysis.equivalentResistance_ohm, 'Ω');
  const iTotalA = formatCurrentA(analysis.totalCurrent_A);
  const iTotalmA = formatCurrentmA(analysis.totalCurrent_A);
  const pTotalDisplay = formatMeasure(analysis.totalPower_W, 'W');

  const topologySummaryLabel =
    topology === 'series'
      ? `Serie (${analysis.resistors.length} ${analysis.resistors.length === 1 ? 'resistencia' : 'resistencias'})`
      : topology === 'parallel'
        ? `Paralelo (${analysis.resistors.length} ramas)`
        : 'Mixto (R₁ + R₂ ∥ R₃)';

  const formulaLines = useMemo(() => {
    const rLabels = analysis.resistors.map((r) => `${formatInputValue(r.resistance, 2)} Ω`);
    if (topology === 'series') {
      return [
        `R_eq = ${rLabels.join(' + ')} = ${reqDisplay}`,
        `I_total = V / R_eq = ${voltageDisplay} V / ${reqDisplay} = ${iTotalA} (${iTotalmA})`,
        `P_total = V · I_total = ${pTotalDisplay}   |   LKV: Σ Vᵢ = ${voltageDisplay} V`,
      ];
    }
    if (topology === 'parallel') {
      const invTerms = analysis.resistors.map((r) => `1/${formatInputValue(r.resistance, 2)}`).join(' + ');
      return [
        `1 / R_eq = ${invTerms}  →  R_eq = ${reqDisplay}`,
        `I_total = V / R_eq = ${voltageDisplay} V / ${reqDisplay} = ${iTotalA} (${iTotalmA})`,
        `P_total = V · I_total = ${pTotalDisplay}   |   LKC: Σ Iᵢ = ${iTotalA}`,
      ];
    }
    const [r1, r2, r3] = analysis.resistors;
    const r23Str = formatMeasure(analysis.parallelGroupResistance_ohm ?? 0, 'Ω');
    return [
      `R₂₃ = (${formatInputValue(r2.resistance, 2)} · ${formatInputValue(r3.resistance, 2)}) / (${formatInputValue(r2.resistance, 2)} + ${formatInputValue(r3.resistance, 2)}) = ${r23Str}  →  R_eq = ${formatInputValue(r1.resistance, 2)} Ω + ${r23Str} = ${reqDisplay}`,
      `I_total = I₁ = V / R_eq = ${iTotalA} (${iTotalmA})  |  V₂ = V₃ = ${formatMeasure(r2.voltage_V, 'V')}`,
      `P_total = V · I_total = ${pTotalDisplay}   |   LKC: I₂ + I₃ = I₁`,
    ];
  }, [topology, analysis, reqDisplay, voltageDisplay, iTotalA, iTotalmA, pTotalDisplay]);

  const roleHintForResistor = (idx: number): string | null => {
    if (topology !== 'mixed') return null;
    if (idx === 0) return 'En serie';
    if (idx === 1) return 'Rama paralela A';
    return 'Rama paralela B';
  };

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-x-hidden bg-white/95 dark:bg-[#16241A]/95 rounded-3xl p-3 sm:p-5 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 shadow-sm ${
        compact ? 'max-w-md' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#ADCA88]/30 dark:border-[#3C5A40]/30 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] text-white flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-[#546C37] dark:text-[#CFE3A8] uppercase tracking-wider font-['Pixelify_Sans'] break-words">
            Simulador: Ley de Ohm y Circuitos CC
          </span>
        </div>
        <span className="text-xs font-medium text-[#546C37]/85 dark:text-[#CFE3A8]/85 tabular-nums">
          {topologySummaryLabel} · V: {OHM_VOLTAGE_MIN}–{OHM_VOLTAGE_MAX} V · R: {OHM_RESISTANCE_MIN}–{OHM_RESISTANCE_MAX} Ω
        </span>
      </div>

      {/* Topology Selector (3 modes) */}
      <div
        role="group"
        aria-label="Selector de topología del circuito"
        className="flex flex-wrap gap-2 mb-3.5 w-full min-w-0"
      >
        {(
          [
            { id: 'series', label: 'Serie (1–4 R)' },
            { id: 'parallel', label: 'Paralelo (2–4 ramas)' },
            { id: 'mixed', label: 'Mixto (R₁ + R₂ ∥ R₃)' },
          ] as const
        ).map((tab) => {
          const isActive = topology === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTopology(tab.id)}
              aria-pressed={isActive}
              className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#546C37] ${
                isActive
                  ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-sm'
                  : 'bg-[#FFFBD9] dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/60 dark:border-[#3C5A40]/60 hover:bg-[#D6E3B1]/60 dark:hover:bg-[#24402B]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Adjusted range notice (if mounted with adjusted params) */}
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

      {/* Main layout: stacked on mobile/tablet, side-by-side on desktop (lg:) */}
      <div className={compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'}>
        {/* Left / Top: Schematic SVG + Summary Readout + Breakdown Table + Formula */}
        <div className={compact ? 'col-span-1 min-w-0 space-y-3' : 'col-span-1 lg:col-span-7 min-w-0 space-y-3'}>
          <div className="w-full min-w-0 bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 rounded-2xl p-2 border border-[#ADCA88]/35 dark:border-[#3C5A40]/35 overflow-hidden">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              role="img"
              aria-label={`Esquema de circuito ${topologySummaryLabel} con fuente de ${voltageDisplay} voltios, resistencia equivalente de ${reqDisplay} y corriente total de ${iTotalA}.`}
              className="w-full h-auto max-h-[340px] sm:max-h-[400px] select-none block"
            >
              {/* Top-left topology title & top-right convention note */}
              <text
                x={14}
                y={22}
                textAnchor="start"
                className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-['Space_Grotesk']"
              >
                {topologySummaryLabel}
              </text>
              <text
                x={SVG_WIDTH - 14}
                y={22}
                textAnchor="end"
                className="text-[10px] fill-[#546C37]/75 dark:fill-[#CFE3A8]/75 font-['Space_Grotesk']"
              >
                Flujo convencional (+ → −) · Flechas ∝ I
              </text>

              {/* ================= SERIES TOPOLOGY ================= */}
              {topology === 'series' && (
                <g>
                  {/* Circuit rectangular wires */}
                  <g
                    className="stroke-[#546C37] dark:stroke-[#8FB35E]"
                    strokeWidth={3.2}
                    fill="none"
                    strokeLinecap="round"
                  >
                    {/* Left wire around battery */}
                    <line x1={BATTERY_X} y1={76} x2={BATTERY_X} y2={146} />
                    <line x1={BATTERY_X} y1={194} x2={BATTERY_X} y2={264} />
                    {/* Top wire (drawn continuously; resistor boxes cleanly sit on top) */}
                    <line x1={BATTERY_X} y1={76} x2={584} y2={76} />
                    {/* Right vertical wire */}
                    <line x1={584} y1={76} x2={584} y2={264} />
                    {/* Bottom return wire */}
                    <line x1={584} y1={264} x2={BATTERY_X} y2={264} />
                  </g>

                  {/* Series Resistors */}
                  {analysis.resistors.map((r, idx) => {
                    const cx = seriesCenters[idx] ?? 344;
                    return (
                      <g key={r.id}>
                        <HorizontalResistorZigzag cx={cx} cy={76} />
                        <text
                          x={cx}
                          y={44}
                          textAnchor="middle"
                          className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk']"
                        >
                          {r.label}
                        </text>
                        {showValues && (
                          <>
                            <text
                              x={cx}
                              y={57}
                              textAnchor="middle"
                              className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                            >
                              {formatInputValue(r.resistance, 2)} Ω
                            </text>
                            <text
                              x={cx}
                              y={108}
                              textAnchor="middle"
                              className="text-[10.5px] font-semibold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                            >
                              V{SUBSCRIPTS[idx] ?? idx + 1} = {formatMeasure(r.voltage_V, 'V')}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* Return current label */}
                  {showValues && (
                    <text
                      x={341}
                      y={246}
                      textAnchor="middle"
                      className="text-[11.5px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                    >
                      I_total = {iTotalA} ({iTotalmA})
                    </text>
                  )}

                  {/* Bottom summary note */}
                  <text
                    x={341}
                    y={316}
                    textAnchor="middle"
                    className="text-[10.5px] fill-[#546C37]/80 dark:fill-[#CFE3A8]/80 font-['Space_Grotesk']"
                  >
                    Misma corriente I en cada resistencia · V = Σ Vᵢ · R_eq = {reqDisplay}
                  </text>
                </g>
              )}

              {/* ================= PARALLEL TOPOLOGY ================= */}
              {topology === 'parallel' && (
                <g>
                  {(() => {
                    const lastX = parallelBranchXs[parallelBranchXs.length - 1] ?? 455;
                    const firstX = parallelBranchXs[0] ?? 265;
                    return (
                      <>
                        {/* Main buses and battery leads */}
                        <g
                          className="stroke-[#546C37] dark:stroke-[#8FB35E]"
                          strokeWidth={3.2}
                          fill="none"
                          strokeLinecap="round"
                        >
                          <line x1={BATTERY_X} y1={68} x2={BATTERY_X} y2={146} />
                          <line x1={BATTERY_X} y1={194} x2={BATTERY_X} y2={272} />
                          <line x1={BATTERY_X} y1={68} x2={lastX} y2={68} />
                          <line x1={BATTERY_X} y1={272} x2={lastX} y2={272} />
                          {parallelBranchXs.map((bx, idx) => (
                            <line key={`wire-${idx}`} x1={bx} y1={68} x2={bx} y2={272} />
                          ))}
                        </g>

                        {/* Junction dots */}
                        {parallelBranchXs.slice(0, -1).map((bx, idx) => (
                          <g key={`junc-${idx}`} className="fill-[#546C37] dark:fill-[#8FB35E]">
                            <circle cx={bx} cy={68} r={4.2} />
                            <circle cx={bx} cy={272} r={4.2} />
                          </g>
                        ))}

                        {/* Parallel Resistors & Branch Labels */}
                        {analysis.resistors.map((r, idx) => {
                          const bx = parallelBranchXs[idx] ?? 265;
                          return (
                            <g key={r.id}>
                              <VerticalResistorZigzag cx={bx} cy={170} />
                              <text
                                x={bx + 19}
                                y={154}
                                textAnchor="start"
                                className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk']"
                              >
                                {r.label}
                              </text>
                              {showValues && (
                                <>
                                  <text
                                    x={bx + 19}
                                    y={170}
                                    textAnchor="start"
                                    className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                                  >
                                    {formatInputValue(r.resistance, 2)} Ω
                                  </text>
                                  <text
                                    x={bx + 19}
                                    y={186}
                                    textAnchor="start"
                                    className="text-[10.5px] font-semibold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                                  >
                                    I{SUBSCRIPTS[idx] ?? idx + 1} = {formatCompactCurrent(r.current_A)}
                                  </text>
                                </>
                              )}
                            </g>
                          );
                        })}

                        {/* Main trunk current label */}
                        {showValues && (
                          <text
                            x={(BATTERY_X + firstX) / 2}
                            y={52}
                            textAnchor="middle"
                            className="text-[11px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                          >
                            I_total = {formatCompactCurrent(analysis.totalCurrent_A)}
                          </text>
                        )}

                        <text
                          x={330}
                          y={316}
                          textAnchor="middle"
                          className="text-[10.5px] fill-[#546C37]/80 dark:fill-[#CFE3A8]/80 font-['Space_Grotesk']"
                        >
                          Mismo voltaje V = {voltageDisplay} V en cada rama · I_total = Σ Iᵢ · R_eq = {reqDisplay}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* ================= MIXED TOPOLOGY (R1 + R2 || R3) ================= */}
              {topology === 'mixed' && analysis.resistors.length === 3 && (
                <g>
                  {/* Circuit Wires */}
                  <g
                    className="stroke-[#546C37] dark:stroke-[#8FB35E]"
                    strokeWidth={3.2}
                    fill="none"
                    strokeLinecap="round"
                  >
                    {/* Battery left vertical */}
                    <line x1={BATTERY_X} y1={76} x2={BATTERY_X} y2={146} />
                    <line x1={BATTERY_X} y1={194} x2={BATTERY_X} y2={264} />
                    {/* Top wire through R1 to Node A and Branch 3 */}
                    <line x1={BATTERY_X} y1={76} x2={515} y2={76} />
                    {/* Branch R2 vertical (Node A to Node B) */}
                    <line x1={350} y1={76} x2={350} y2={264} />
                    {/* Branch R3 vertical */}
                    <line x1={515} y1={76} x2={515} y2={264} />
                    {/* Bottom return wire */}
                    <line x1={515} y1={264} x2={BATTERY_X} y2={264} />
                  </g>

                  {/* Nodes A and B */}
                  <g className="fill-[#546C37] dark:fill-[#8FB35E]">
                    <circle cx={350} cy={76} r={4.5} />
                    <circle cx={350} cy={264} r={4.5} />
                  </g>
                  <text
                    x={350}
                    y={62}
                    textAnchor="middle"
                    className="text-[10.5px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
                  >
                    Nodo A
                  </text>
                  <text
                    x={350}
                    y={284}
                    textAnchor="middle"
                    className="text-[10.5px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono"
                  >
                    Nodo B
                  </text>

                  {/* R1 (Series horizontal) */}
                  <HorizontalResistorZigzag cx={224} cy={76} />
                  <text
                    x={224}
                    y={44}
                    textAnchor="middle"
                    className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk']"
                  >
                    R₁ (Serie)
                  </text>
                  {showValues && (
                    <>
                      <text
                        x={224}
                        y={57}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                      >
                        {formatInputValue(analysis.resistors[0].resistance, 2)} Ω
                      </text>
                      <text
                        x={224}
                        y={108}
                        textAnchor="middle"
                        className="text-[10.5px] font-semibold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                      >
                        V₁ = {formatMeasure(analysis.resistors[0].voltage_V, 'V')}
                      </text>
                    </>
                  )}

                  {/* R2 (Parallel Branch A at x=350) */}
                  <VerticalResistorZigzag cx={350} cy={170} />
                  <text
                    x={369}
                    y={154}
                    textAnchor="start"
                    className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk']"
                  >
                    R₂
                  </text>
                  {showValues && (
                    <>
                      <text
                        x={369}
                        y={170}
                        textAnchor="start"
                        className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                      >
                        {formatInputValue(analysis.resistors[1].resistance, 2)} Ω
                      </text>
                      <text
                        x={369}
                        y={186}
                        textAnchor="start"
                        className="text-[10.5px] font-semibold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                      >
                        I₂ = {formatCompactCurrent(analysis.resistors[1].current_A)}
                      </text>
                    </>
                  )}

                  {/* R3 (Parallel Branch B at x=515) */}
                  <VerticalResistorZigzag cx={515} cy={170} />
                  <text
                    x={534}
                    y={154}
                    textAnchor="start"
                    className="text-[12px] font-bold fill-[#3D121A] dark:fill-[#FBE9E4] font-['Space_Grotesk']"
                  >
                    R₃
                  </text>
                  {showValues && (
                    <>
                      <text
                        x={534}
                        y={170}
                        textAnchor="start"
                        className="text-[11px] font-bold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                      >
                        {formatInputValue(analysis.resistors[2].resistance, 2)} Ω
                      </text>
                      <text
                        x={534}
                        y={186}
                        textAnchor="start"
                        className="text-[10.5px] font-semibold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                      >
                        I₃ = {formatCompactCurrent(analysis.resistors[2].current_A)}
                      </text>
                    </>
                  )}

                  {/* Return current and parallel voltage annotations */}
                  {showValues && (
                    <>
                      <text
                        x={224}
                        y={248}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-[#941C2F] dark:fill-[#FF9FAE] font-mono tabular-nums"
                      >
                        I_total = I₁ = {formatCompactCurrent(analysis.totalCurrent_A)}
                      </text>
                      <text
                        x={433}
                        y={248}
                        textAnchor="middle"
                        className="text-[10.5px] font-semibold fill-[#546C37] dark:fill-[#CFE3A8] font-mono tabular-nums"
                      >
                        V₂ = V₃ = {formatMeasure(analysis.resistors[1].voltage_V, 'V')}
                      </text>
                    </>
                  )}

                  <text
                    x={330}
                    y={316}
                    textAnchor="middle"
                    className="text-[10.5px] fill-[#546C37]/80 dark:fill-[#CFE3A8]/80 font-['Space_Grotesk']"
                  >
                    R₂₃ = {formatMeasure(analysis.parallelGroupResistance_ohm ?? 0, 'Ω')} · R_eq = R₁ + R₂₃ = {reqDisplay} · I₁ = I₂ + I₃
                  </text>
                </g>
              )}

              {/* Animated Directional Current Arrows (proportional to segment current I) */}
              {showCurrentArrows &&
                analysis.totalCurrent_A > 0 &&
                flowSegments.map((seg) => {
                  if (seg.current_A <= 0) return null;
                  const dx = seg.x2 - seg.x1;
                  const dy = seg.y2 - seg.y1;
                  const len = Math.hypot(dx, dy);
                  if (len < 16) return null;

                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  const scale = flowArrowScale(seg.current_A, analysis.totalCurrent_A);
                  const speed = flowSpeedPxPerS(seg.current_A);
                  const gap = seg.spacing ?? 50;
                  const count = prefersReducedMotion ? 1 : Math.max(1, Math.floor(len / gap));
                  const step = len / count;
                  const phase = prefersReducedMotion ? len * 0.5 : (elapsedSec * speed) % step;

                  return (
                    <g key={seg.id} aria-hidden="true">
                      {Array.from({ length: count }, (_, k) => {
                        const dist = prefersReducedMotion ? len * 0.5 : (phase + k * step) % len;
                        const t = dist / len;
                        const px = seg.x1 + dx * t;
                        const py = seg.y1 + dy * t;
                        const edgeFade = prefersReducedMotion
                          ? 1
                          : Math.min(1, dist / 10, (len - dist) / 10);
                        const opacity = Math.max(0, Math.min(0.95, edgeFade * 0.95));

                        return (
                          <g
                            key={k}
                            transform={`translate(${px.toFixed(1)}, ${py.toFixed(1)}) rotate(${angleDeg.toFixed(1)}) scale(${scale.toFixed(2)})`}
                            opacity={opacity.toFixed(2)}
                          >
                            <polygon
                              points="6.5,0 -4.5,-4.5 -2,0 -4.5,4.5"
                              fill="#D93848"
                              stroke="#FFFBD9"
                              strokeWidth={0.8}
                              className="dark:fill-[#FF8FA0] dark:stroke-[#0F1A0F]"
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

              {/* DC Voltage Source (rendered on top of left wire) */}
              <VoltageSourceGlyph
                x={BATTERY_X}
                cy={170}
                voltageDisplay={voltageDisplay}
                showValues={showValues}
              />
            </svg>
          </div>

          {/* 3-Card Circuit Totals Summary (Req, Itotal in A & mA, Ptotal) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
            <div className="min-w-0 bg-[#D6E3B1]/55 dark:bg-[#1E3323]/80 rounded-2xl px-3 py-2.5 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50">
              <span className="block text-[10px] font-mono uppercase tracking-wide text-[#546C37]/85 dark:text-[#CFE3A8]/85">
                Resistencia eq. (R_eq)
              </span>
              <span className="block text-sm font-bold text-[#3D121A] dark:text-[#FBE9E4] font-mono tabular-nums mt-0.5 break-words">
                {reqDisplay}
              </span>
              <span className="block text-[10px] text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-mono tabular-nums">
                {topology === 'mixed'
                  ? `R₂₃ = ${formatMeasure(analysis.parallelGroupResistance_ohm ?? 0, 'Ω')}`
                  : `${analysis.resistors.length} ${analysis.resistors.length === 1 ? 'elemento' : 'elementos'}`}
              </span>
            </div>

            <div className="min-w-0 bg-[#FFF2EE] dark:bg-[#3A1820]/70 rounded-2xl px-3 py-2.5 border border-[#FA8989]/45 dark:border-[#8A3A4A]/55">
              <span className="block text-[10px] font-mono uppercase tracking-wide text-[#941C2F]/85 dark:text-[#FF9FAE]/85">
                Corriente total (I_total)
              </span>
              <span className="block text-sm font-bold text-[#941C2F] dark:text-[#FF9FAE] font-mono tabular-nums mt-0.5 break-words">
                {iTotalA}
              </span>
              <span className="block text-[10.5px] font-semibold text-[#3D121A]/80 dark:text-[#FBE9E4]/80 font-mono tabular-nums">
                {iTotalmA}
              </span>
            </div>

            <div className="min-w-0 bg-[#FFFBD9] dark:bg-[#0F1A0F]/90 rounded-2xl px-3 py-2.5 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50">
              <span className="block text-[10px] font-mono uppercase tracking-wide text-[#546C37]/85 dark:text-[#CFE3A8]/85">
                Potencia total (P)
              </span>
              <span className="block text-sm font-bold text-[#546C37] dark:text-[#CFE3A8] font-mono tabular-nums mt-0.5 break-words">
                {pTotalDisplay}
              </span>
              <span className="block text-[10px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 font-mono tabular-nums">
                V · I = {voltageDisplay} V × {formatSig(analysis.totalCurrent_A, 3)} A
              </span>
            </div>
          </div>

          {/* Individual Component Breakdown Table (Vi, Ii, Pi per resistor) */}
          <div className="w-full min-w-0 bg-[#FFFBD9]/55 dark:bg-[#0F1A0F]/75 rounded-2xl border border-[#ADCA88]/45 dark:border-[#3C5A40]/45 overflow-hidden">
            <div className="px-3 py-2 border-b border-[#ADCA88]/30 dark:border-[#3C5A40]/30 flex flex-wrap items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk']">
                Desglose por componente (Ley de Ohm + Kirchhoff)
              </span>
              <span className="text-[10px] font-mono text-[#546C37]/75 dark:text-[#CFE3A8]/75 tabular-nums">
                Vᵢ = Iᵢ · Rᵢ
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-[#ADCA88]/30 dark:border-[#3C5A40]/30 text-[10.5px] text-[#546C37]/85 dark:text-[#CFE3A8]/85">
                    <th className="py-2 px-2.5 font-semibold">Res.</th>
                    <th className="py-2 px-2 font-semibold text-right">Rᵢ (Ω)</th>
                    <th className="py-2 px-2 font-semibold text-right">Voltaje (Vᵢ)</th>
                    <th className="py-2 px-2 font-semibold text-right">Corriente (Iᵢ)</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Potencia (Pᵢ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ADCA88]/20 dark:divide-[#3C5A40]/20 text-[#3D121A] dark:text-[#FBE9E4]">
                  {analysis.resistors.map((r, idx) => {
                    const role = roleHintForResistor(idx);
                    return (
                      <tr key={r.id} className="hover:bg-[#D6E3B1]/25 dark:hover:bg-[#1E3323]/40">
                        <td className="py-2 px-2.5 font-bold whitespace-nowrap">
                          <span>{r.label}</span>
                          {role && (
                            <span className="block text-[9.5px] font-sans font-normal text-[#546C37]/75 dark:text-[#CFE3A8]/75">
                              {role}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {formatInputValue(r.resistance, 2)} Ω
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap font-semibold text-[#546C37] dark:text-[#CFE3A8]">
                          {formatMeasure(r.voltage_V, 'V')}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <span className="font-semibold text-[#941C2F] dark:text-[#FF9FAE]">
                            {formatCurrentA(r.current_A)}
                          </span>
                          <span className="block text-[10px] text-[#3D121A]/70 dark:text-[#FBE9E4]/70">
                            {formatCurrentmA(r.current_A)}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          {formatMeasure(r.power_W, 'W')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Formula Box */}
          <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl px-3 py-2.5 border border-[#ADCA88]/40 dark:border-[#3C5A40]/40 text-[11.5px] text-[#3D121A] dark:text-[#FBE9E4] font-mono tabular-nums space-y-1 break-words">
            <div>{formulaLines[0]}</div>
            <div className="font-bold text-[#941C2F] dark:text-[#FF9FAE]">{formulaLines[1]}</div>
            <div>{formulaLines[2]}</div>
          </div>
        </div>

        {/* Right / Bottom Control Panel */}
        <div
          className={`w-full min-w-0 bg-[#FFFBD9]/50 dark:bg-[#0F1A0F]/60 rounded-2xl p-3 sm:p-4 border border-[#ADCA88]/35 dark:border-[#3C5A40]/35 space-y-4 ${
            compact ? 'col-span-1' : 'col-span-1 lg:col-span-5'
          }`}
        >
          {/* Voltage Source Control */}
          <div className="space-y-1.5 pb-3 border-b border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label htmlFor="ohm-v" className="font-bold text-[#941C2F] dark:text-[#FF9FAE]">
                Voltaje de la fuente (V)
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="ohm-v-input"
                  type="number"
                  inputMode="decimal"
                  min={OHM_VOLTAGE_MIN}
                  max={OHM_VOLTAGE_MAX}
                  step="any"
                  value={voltageInput}
                  onChange={(e) => handleVoltageInputChange(e.target.value)}
                  onBlur={handleVoltageInputCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVoltageInputCommit();
                  }}
                  aria-label="Valor exacto de voltaje de la fuente en voltios"
                  className="w-20 min-h-[40px] px-2 py-1 text-right text-xs font-bold font-mono tabular-nums rounded-lg bg-white dark:bg-[#16241A] text-[#941C2F] dark:text-[#FF9FAE] border border-[#ADCA88] dark:border-[#3C5A40] focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#8FB35E]"
                />
                <span className="font-bold text-xs text-[#941C2F] dark:text-[#FF9FAE] w-4">V</span>
              </div>
            </div>
            <input
              id="ohm-v"
              type="range"
              min={OHM_VOLTAGE_MIN}
              max={OHM_VOLTAGE_MAX}
              step={0.5}
              value={voltage}
              onChange={(e) => handleVoltageSlider(Number(e.target.value))}
              aria-label="Voltaje de la fuente en voltios"
              className="w-full h-9 accent-[#941C2F] dark:accent-[#FF9FAE] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#546C37]/75 dark:text-[#CFE3A8]/75">
              <span>{OHM_VOLTAGE_MIN} V</span>
              <span>{OHM_VOLTAGE_MAX} V</span>
            </div>
          </div>

          {/* Resistors Section Header + Add Button */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#546C37] dark:text-[#CFE3A8]">
                Resistencias ({activeDrafts.length}
                {topology === 'mixed' ? ' fijas' : '/4'})
              </span>
              {topology !== 'mixed' && (
                <button
                  type="button"
                  onClick={handleAddResistor}
                  disabled={!canAddResistor}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-[#546C37] dark:bg-[#6E8F47] text-white hover:bg-[#3f5328] dark:hover:bg-[#5c7a3a] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[#546C37]"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{topology === 'parallel' ? 'Agregar rama' : 'Agregar resistencia'}</span>
                </button>
              )}
            </div>

            {/* Individual Resistor Controls */}
            <div className="space-y-2.5">
              {activeDrafts.map((draft, idx) => {
                const label = `R${SUBSCRIPTS[idx] ?? idx + 1}`;
                const role = roleHintForResistor(idx);
                return (
                  <div
                    key={draft.id}
                    className="rounded-xl bg-white/90 dark:bg-[#16241A]/90 p-2.5 border border-[#ADCA88]/45 dark:border-[#3C5A40]/45 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <label
                        htmlFor={`ohm-res-${draft.id}`}
                        className="font-bold text-[#3D121A] dark:text-[#FBE9E4] flex items-center gap-1.5"
                      >
                        <span>{label}</span>
                        {role && (
                          <span className="text-[10.5px] font-normal text-[#546C37]/80 dark:text-[#CFE3A8]/80">
                            · {role}
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id={`ohm-res-input-${draft.id}`}
                          type="number"
                          inputMode="decimal"
                          min={OHM_RESISTANCE_MIN}
                          max={OHM_RESISTANCE_MAX}
                          step="any"
                          value={draft.input}
                          onChange={(e) => handleResistorInputChange(draft.id, e.target.value)}
                          onBlur={() => handleResistorInputCommit(draft.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleResistorInputCommit(draft.id);
                          }}
                          aria-label={`Valor exacto de ${label} en ohmios`}
                          className="w-20 min-h-[40px] px-2 py-1 text-right text-xs font-bold font-mono tabular-nums rounded-lg bg-[#FFFBD9]/60 dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88] dark:border-[#3C5A40] focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#8FB35E]"
                        />
                        <span className="font-bold text-xs text-[#546C37] dark:text-[#CFE3A8] w-4">
                          Ω
                        </span>
                        {topology !== 'mixed' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveResistor(draft.id)}
                            disabled={!canRemoveResistor}
                            aria-label={`Quitar ${label}`}
                            title={`Quitar ${label}`}
                            className="min-h-[40px] px-2 rounded-lg text-[11px] font-semibold text-[#941C2F] dark:text-[#FF9FAE] hover:bg-[#FFF2EE] dark:hover:bg-[#3A1820]/70 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Quitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      id={`ohm-res-${draft.id}`}
                      type="range"
                      min={OHM_RESISTANCE_MIN}
                      max={OHM_RESISTANCE_MAX}
                      step={1}
                      value={Math.round(draft.value)}
                      onChange={(e) => handleResistorSlider(draft.id, Number(e.target.value))}
                      aria-label={`Deslizador de ${label} en ohmios`}
                      className="w-full h-9 accent-[#546C37] dark:accent-[#8FB35E] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-between gap-1 text-[10px] font-mono text-[#546C37]/75 dark:text-[#CFE3A8]/75">
              <span>{OHM_RESISTANCE_MIN} Ω</span>
              <span>Valores exactos (ej. 3, 4, 6, 12 Ω)</span>
              <span>{OHM_RESISTANCE_MAX} Ω</span>
            </div>
          </div>

          {/* Display Options */}
          <div className="pt-2 space-y-1 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/30">
            <label className="min-h-[40px] flex items-center gap-2.5 text-xs font-medium text-[#546C37] dark:text-[#CFE3A8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showValues}
                onChange={(e) => setShowValues(e.target.checked)}
                aria-label="Mostrar etiquetas y valores en el circuito"
                className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] rounded cursor-pointer"
              />
              <span>Mostrar valores en esquema</span>
            </label>

            <label className="min-h-[40px] flex items-center gap-2.5 text-xs font-medium text-[#546C37] dark:text-[#CFE3A8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCurrentArrows}
                onChange={(e) => setShowCurrentArrows(e.target.checked)}
                aria-label="Mostrar flechas animadas de flujo de corriente"
                className="w-4 h-4 accent-[#546C37] dark:accent-[#8FB35E] rounded cursor-pointer"
              />
              <span>Flechas animadas de corriente (I)</span>
            </label>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[44px] py-2 px-4 bg-[#D6E3B1] dark:bg-[#24402B] hover:bg-[#ADCA88] dark:hover:bg-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#546C37]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar circuito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
