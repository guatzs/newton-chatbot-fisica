export const K_COULOMB = 8.988e9; // N·m²/C²

export const COULOMB_MIN_X_M = 0.4;
export const COULOMB_MAX_X_M = 2.6;

/**
 * Fuerza de Coulomb con signo: >0 repulsiva (q1·q2 > 0), <0 atractiva, 0 si alguna carga es 0.
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
 * Longitud de flecha en px: 0 si f = 0; si no, 20 + 50 * clamp01((log10(|f|) + 5) / 7).
 * Equivale a escala logarítmica entre 1e-5 N (20 px) y 1e2 N (70 px).
 */
export function forceArrowLengthPx(f: number): number {
  const absF = Math.abs(f);
  if (absF === 0 || !Number.isFinite(absF)) return 0;
  const normalized = (Math.log10(absF) + 5) / 7;
  const clamped01 = Math.min(1, Math.max(0, normalized));
  return 20 + 50 * clamped01;
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
