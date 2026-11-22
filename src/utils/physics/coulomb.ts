import { CM_TO_M, K_COULOMB, NC_TO_C, UC_TO_C } from './constants';

export { K_COULOMB };

export const COULOMB_MIN_X_M = 0.4;
export const COULOMB_MAX_X_M = 2.6;

export type ChargeUnit = 'nC' | 'uC';
export type VectorScaleMode = 'logarithmic' | 'linear';

export interface PointCharge2D {
  id: string;
  label: string;
  q: number;
  unit: ChargeUnit;
  x_cm: number;
  y_cm: number;
}

export interface IndividualForce2D {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  dx_m: number;
  dy_m: number;
  r_m: number;
  fx: number;
  fy: number;
  magnitude: number;
  angleDeg: number;
  nature: 'repulsiva' | 'atractiva' | 'nula';
  overlapping: boolean;
}

export interface OverlappingChargePair {
  aId: string;
  aLabel: string;
  bId: string;
  bLabel: string;
}

export interface SuperpositionResult2D {
  targetId: string;
  contributions: IndividualForce2D[];
  netFx: number;
  netFy: number;
  netMagnitude: number;
  netAngleDeg: number;
  overlappingPairs: OverlappingChargePair[];
  targetHasOverlap: boolean;
}

/** Distancia mínima en metros (0.01 cm) por debajo de la cual dos cargas se consideran superpuestas. */
export const MIN_SEPARATION_M = 1e-4;

export function chargeToCoulombs(q: number, unit: ChargeUnit): number {
  return q * (unit === 'uC' ? UC_TO_C : NC_TO_C);
}

/**
 * Fuerza de Coulomb 1D con signo: >0 repulsiva (q1·q2 > 0), <0 atractiva, 0 si alguna carga es 0.
 * Lanza RangeError si r_m no es finito o r_m <= 0.
 */
export function coulombForce(q1_C: number, q2_C: number, r_m: number): number {
  if (!Number.isFinite(r_m) || r_m <= 0) {
    throw new RangeError('La distancia r debe ser un número finito mayor que 0.');
  }
  const f = (K_COULOMB * (q1_C * q2_C)) / (r_m * r_m);
  return f === 0 ? 0 : f;
}

export function coulombNature(f: number): 'repulsiva' | 'atractiva' | 'nula' {
  if (f > 0) return 'repulsiva';
  if (f < 0) return 'atractiva';
  return 'nula';
}

/**
 * Normaliza un ángulo vectorial en grados dentro de [0, 360).
 */
export function vectorAngleDeg(fx: number, fy: number): number {
  if (fx === 0 && fy === 0) return 0;
  let deg = (Math.atan2(fy, fx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  if (deg >= 360 || Object.is(deg, -0)) deg = 0;
  return deg;
}

/**
 * Calcula las fuerzas individuales y la fuerza eléctrica neta en 2D sobre `targetId`
 * aplicando el principio de superposición con k = 9 × 10⁹ N·m²/C².
 * Protege contra divisiones por cero si dos cargas coinciden en la misma coordenada.
 */
export function calculateSuperposition2D(
  charges: PointCharge2D[],
  targetId: string
): SuperpositionResult2D {
  const overlappingPairs: OverlappingChargePair[] = [];
  for (let i = 0; i < charges.length; i++) {
    for (let j = i + 1; j < charges.length; j++) {
      const a = charges[i];
      const b = charges[j];
      const dist_m = Math.hypot((b.x_cm - a.x_cm) * CM_TO_M, (b.y_cm - a.y_cm) * CM_TO_M);
      if (dist_m < MIN_SEPARATION_M) {
        overlappingPairs.push({
          aId: a.id,
          aLabel: a.label,
          bId: b.id,
          bLabel: b.label,
        });
      }
    }
  }

  const target = charges.find((c) => c.id === targetId);
  if (!target) {
    return {
      targetId,
      contributions: [],
      netFx: 0,
      netFy: 0,
      netMagnitude: 0,
      netAngleDeg: 0,
      overlappingPairs,
      targetHasOverlap: false,
    };
  }

  const qTarget_C = chargeToCoulombs(target.q, target.unit);
  const contributions: IndividualForce2D[] = [];
  let netFx = 0;
  let netFy = 0;
  let targetHasOverlap = false;

  for (const src of charges) {
    if (src.id === target.id) continue;

    // Vector desde la carga fuente hacia la carga objetivo
    const dx_m = (target.x_cm - src.x_cm) * CM_TO_M;
    const dy_m = (target.y_cm - src.y_cm) * CM_TO_M;
    const r_m = Math.hypot(dx_m, dy_m);

    if (!Number.isFinite(r_m) || r_m < MIN_SEPARATION_M) {
      targetHasOverlap = true;
      contributions.push({
        sourceId: src.id,
        sourceLabel: src.label,
        targetId: target.id,
        dx_m: 0,
        dy_m: 0,
        r_m: 0,
        fx: 0,
        fy: 0,
        magnitude: 0,
        angleDeg: 0,
        nature: 'nula',
        overlapping: true,
      });
      continue;
    }

    const qSrc_C = chargeToCoulombs(src.q, src.unit);
    const product = qSrc_C * qTarget_C;
    const signedMag = (K_COULOMB * product) / (r_m * r_m);

    if (signedMag === 0 || !Number.isFinite(signedMag)) {
      contributions.push({
        sourceId: src.id,
        sourceLabel: src.label,
        targetId: target.id,
        dx_m,
        dy_m,
        r_m,
        fx: 0,
        fy: 0,
        magnitude: 0,
        angleDeg: 0,
        nature: 'nula',
        overlapping: false,
      });
      continue;
    }

    const ux = dx_m / r_m;
    const uy = dy_m / r_m;
    const fx = signedMag * ux;
    const fy = signedMag * uy;
    const magnitude = Math.hypot(fx, fy);

    netFx += fx;
    netFy += fy;

    contributions.push({
      sourceId: src.id,
      sourceLabel: src.label,
      targetId: target.id,
      dx_m,
      dy_m,
      r_m,
      fx: fx === 0 ? 0 : fx,
      fy: fy === 0 ? 0 : fy,
      magnitude,
      angleDeg: vectorAngleDeg(fx, fy),
      nature: coulombNature(signedMag),
      overlapping: false,
    });
  }

  // Limpiar residuos de punto flotante muy pequeños cuando las fuerzas se cancelan por simetría
  const maxCompMag = contributions.reduce((acc, c) => Math.max(acc, c.magnitude), 0);
  const zeroTol = maxCompMag * 1e-12;
  if (Math.abs(netFx) <= zeroTol) netFx = 0;
  if (Math.abs(netFy) <= zeroTol) netFy = 0;

  const netMagnitude = Math.hypot(netFx, netFy);

  return {
    targetId: target.id,
    contributions,
    netFx: netFx === 0 ? 0 : netFx,
    netFy: netFy === 0 ? 0 : netFy,
    netMagnitude: netMagnitude === 0 ? 0 : netMagnitude,
    netAngleDeg: netMagnitude === 0 ? 0 : vectorAngleDeg(netFx, netFy),
    overlappingPairs,
    targetHasOverlap,
  };
}

/**
 * Longitud de flecha en px para modo 1D (logarítmica entre 1e-5 N y 1e2 N).
 */
export function forceArrowLengthPx(f: number): number {
  const absF = Math.abs(f);
  if (absF === 0 || !Number.isFinite(absF)) return 0;
  const normalized = (Math.log10(absF) + 5) / 7;
  const clamped01 = Math.min(1, Math.max(0, normalized));
  return 20 + 50 * clamped01;
}

/**
 * Longitud de flecha en px para el plano 2D con soporte de escala lineal o logarítmica.
 */
export function vectorArrowLength2DPx(
  magnitude: number,
  maxMagnitude: number,
  mode: VectorScaleMode,
  minPx = 22,
  maxPx = 104
): number {
  if (!Number.isFinite(magnitude) || magnitude <= 0) return 0;
  if (mode === 'linear') {
    if (!Number.isFinite(maxMagnitude) || maxMagnitude <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, magnitude / maxMagnitude));
    return Math.max(6, ratio * maxPx);
  }
  // Escala logarítmica amplia: cubre de 1e-8 N (minPx) hasta 1e2 N (maxPx)
  const normalized = (Math.log10(magnitude) + 8) / 10;
  const clamped01 = Math.min(1, Math.max(0, normalized));
  return minPx + (maxPx - minPx) * clamped01;
}

/**
 * Centra el par en `mid_m` con separación r_m y lo desplaza para que ambos centros queden en [0.4, 2.6] m.
 */
export function fitPositions(mid_m: number, r_m: number): { x1_m: number; x2_m: number } {
  let x1_m = mid_m - r_m / 2;
  let x2_m = mid_m + r_m / 2;

  if (x1_m < COULOMB_MIN_X_M) {
    x1_m = COULOMB_MIN_X_M;
    x2_m = COULOMB_MIN_X_M + r_m;
  }
  if (x2_m > COULOMB_MAX_X_M) {
    x2_m = COULOMB_MAX_X_M;
    x1_m = COULOMB_MAX_X_M - r_m;
  }

  return { x1_m, x2_m };
}
