export const OHM_MAX_CURRENT_A = 1.2; // 12 V / 10 Ω (referencia para pruebas legadas)
export const OHM_MAX_BRIGHTNESS_A = 0.3;

export const OHM_VOLTAGE_MIN = 1;
export const OHM_VOLTAGE_MAX = 100;
export const OHM_RESISTANCE_MIN = 1;
export const OHM_RESISTANCE_MAX = 1000;

export type CircuitTopology = 'series' | 'parallel' | 'mixed';

export interface ResistorInput {
  id: string;
  label: string;
  resistance: number;
}

export interface ResistorResult {
  id: string;
  label: string;
  resistance: number;
  voltage_V: number;
  current_A: number;
  power_W: number;
}

export interface CircuitAnalysisResult {
  topology: CircuitTopology;
  sourceVoltage_V: number;
  equivalentResistance_ohm: number;
  parallelGroupResistance_ohm?: number;
  totalCurrent_A: number;
  totalPower_W: number;
  resistors: ResistorResult[];
}

/**
 * I = V / R.
 * Lanza RangeError si R no es finito o R <= 0, o si V no es finito.
 */
export function ohmCurrent(v_V: number, res_ohm: number): number {
  if (!Number.isFinite(res_ohm) || res_ohm <= 0) {
    throw new RangeError('La resistencia R debe ser un número finito mayor que 0.');
  }
  if (!Number.isFinite(v_V)) {
    throw new RangeError('El voltaje V debe ser un número finito.');
  }
  const i = v_V / res_ohm;
  return i === 0 ? 0 : i;
}

/**
 * P = V · I (W).
 */
export function ohmPower(v_V: number, res_ohm: number): number {
  const i = ohmCurrent(v_V, res_ohm);
  const p = v_V * i;
  return p === 0 ? 0 : p;
}

/**
 * Resuelve circuitos resistivos de CC en topología Serie (1–4 resistencias),
 * Paralelo (2–4 resistencias) o Mixto clásico (R1 en serie con R2 ∥ R3),
 * cumpliendo exactamente la Ley de Ohm y las Leyes de Kirchhoff (LKV y LKC).
 */
export function solveOhmCircuit(
  topology: CircuitTopology,
  sourceVoltage_V: number,
  resistors: ResistorInput[]
): CircuitAnalysisResult {
  if (!Number.isFinite(sourceVoltage_V) || sourceVoltage_V < 0) {
    throw new RangeError('El voltaje de la fuente V debe ser un número finito mayor o igual a 0.');
  }

  if (!Array.isArray(resistors) || resistors.length === 0) {
    throw new RangeError('Se requiere al menos una resistencia válida.');
  }

  if (topology === 'series' && (resistors.length < 1 || resistors.length > 4)) {
    throw new RangeError('El circuito en serie soporta entre 1 y 4 resistencias.');
  }
  if (topology === 'parallel' && (resistors.length < 2 || resistors.length > 4)) {
    throw new RangeError('El circuito en paralelo soporta entre 2 y 4 resistencias.');
  }
  if (topology === 'mixed' && resistors.length !== 3) {
    throw new RangeError('El circuito mixto clásico requiere exactamente 3 resistencias (R1 + R2 ∥ R3).');
  }

  for (const r of resistors) {
    if (!Number.isFinite(r.resistance) || r.resistance <= 0) {
      throw new RangeError(`La resistencia ${r.label} debe ser un número finito mayor que 0.`);
    }
  }

  if (topology === 'series') {
    const req = resistors.reduce((acc, r) => acc + r.resistance, 0);
    const totalCurrent = ohmCurrent(sourceVoltage_V, req);
    const totalPower = sourceVoltage_V * totalCurrent;
    const results: ResistorResult[] = resistors.map((r) => {
      const vDrop = totalCurrent * r.resistance;
      return {
        id: r.id,
        label: r.label,
        resistance: r.resistance,
        voltage_V: vDrop === 0 ? 0 : vDrop,
        current_A: totalCurrent,
        power_W: vDrop * totalCurrent === 0 ? 0 : vDrop * totalCurrent,
      };
    });

    return {
      topology,
      sourceVoltage_V,
      equivalentResistance_ohm: req,
      totalCurrent_A: totalCurrent,
      totalPower_W: totalPower === 0 ? 0 : totalPower,
      resistors: results,
    };
  }

  if (topology === 'parallel') {
    const reciprocalSum = resistors.reduce((acc, r) => acc + 1 / r.resistance, 0);
    const req = 1 / reciprocalSum;
    const totalCurrent = ohmCurrent(sourceVoltage_V, req);
    const totalPower = sourceVoltage_V * totalCurrent;
    const results: ResistorResult[] = resistors.map((r) => {
      const iBranch = ohmCurrent(sourceVoltage_V, r.resistance);
      const pBranch = sourceVoltage_V * iBranch;
      return {
        id: r.id,
        label: r.label,
        resistance: r.resistance,
        voltage_V: sourceVoltage_V === 0 ? 0 : sourceVoltage_V,
        current_A: iBranch,
        power_W: pBranch === 0 ? 0 : pBranch,
      };
    });

    return {
      topology,
      sourceVoltage_V,
      equivalentResistance_ohm: req,
      totalCurrent_A: totalCurrent,
      totalPower_W: totalPower === 0 ? 0 : totalPower,
      resistors: results,
    };
  }

  // Mixto clásico: R1 en serie con (R2 ∥ R3)
  const [r1, r2, r3] = resistors;
  const r23 = (r2.resistance * r3.resistance) / (r2.resistance + r3.resistance);
  const req = r1.resistance + r23;
  const totalCurrent = ohmCurrent(sourceVoltage_V, req);
  const totalPower = sourceVoltage_V * totalCurrent;

  const v1 = totalCurrent * r1.resistance;
  const v23 = totalCurrent * r23;
  const i2 = ohmCurrent(v23, r2.resistance);
  const i3 = ohmCurrent(v23, r3.resistance);

  const results: ResistorResult[] = [
    {
      id: r1.id,
      label: r1.label,
      resistance: r1.resistance,
      voltage_V: v1 === 0 ? 0 : v1,
      current_A: totalCurrent,
      power_W: v1 * totalCurrent === 0 ? 0 : v1 * totalCurrent,
    },
    {
      id: r2.id,
      label: r2.label,
      resistance: r2.resistance,
      voltage_V: v23 === 0 ? 0 : v23,
      current_A: i2,
      power_W: v23 * i2 === 0 ? 0 : v23 * i2,
    },
    {
      id: r3.id,
      label: r3.label,
      resistance: r3.resistance,
      voltage_V: v23 === 0 ? 0 : v23,
      current_A: i3,
      power_W: v23 * i3 === 0 ? 0 : v23 * i3,
    },
  ];

  return {
    topology,
    sourceVoltage_V,
    equivalentResistance_ohm: req,
    parallelGroupResistance_ohm: r23,
    totalCurrent_A: totalCurrent,
    totalPower_W: totalPower === 0 ? 0 : totalPower,
    resistors: results,
  };
}

/**
 * Velocidad animada (px/s) para flechas de flujo en función de la corriente I,
 * usando una curva suave logarítmica para mantener legibilidad desde 1 mA hasta 100 A.
 */
export function flowSpeedPxPerS(i_A: number): number {
  if (!Number.isFinite(i_A) || i_A <= 0) return 0;
  // log10(1 + I * 100) mapea 0.001 A -> ~0.04, 0.1 A -> ~1.04, 1 A -> ~2.0, 10 A -> ~3.0, 100 A -> ~4.0
  const normalized = Math.min(1, Math.log10(1 + i_A * 100) / 4);
  return 18 + 132 * normalized;
}

/**
 * Escala visual (0.65..1.18) de las flechas de corriente para distinguir ramas con mayor intensidad.
 */
export function flowArrowScale(i_A: number, maxCurrent_A: number): number {
  if (!Number.isFinite(i_A) || i_A <= 0) return 0;
  if (!Number.isFinite(maxCurrent_A) || maxCurrent_A <= 0) return 0.9;
  const ratio = Math.min(1, Math.max(0, i_A / maxCurrent_A));
  return 0.65 + 0.53 * Math.sqrt(ratio);
}

/**
 * Longitud de la flecha de corriente: 0 si I <= 0; si no, 20 + 50 · min(1, I / 1.2) px.
 */
export function currentArrowLengthPx(i_A: number): number {
  if (!Number.isFinite(i_A) || i_A <= 0) return 0;
  return 20 + 50 * Math.min(1, i_A / OHM_MAX_CURRENT_A);
}

/**
 * Velocidad de los puntos: 0 si I <= 0; si no, 20 + 180 · min(1, I / 1.2) px/s.
 */
export function dotSpeedPxPerS(i_A: number): number {
  if (!Number.isFinite(i_A) || i_A <= 0) return 0;
  return 20 + 180 * Math.min(1, i_A / OHM_MAX_CURRENT_A);
}

/**
 * Brillo de la bombilla 0..1: clamp01(I / 0.3).
 */
export function bulbBrightness(i_A: number): number {
  if (!Number.isFinite(i_A) || i_A <= 0) return 0;
  return Math.min(1, Math.max(0, i_A / OHM_MAX_BRIGHTNESS_A));
}
