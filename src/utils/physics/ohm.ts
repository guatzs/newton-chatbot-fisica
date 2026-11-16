export const OHM_MAX_CURRENT_A = 1.2; // 12 V / 10 Ω
export const OHM_MAX_BRIGHTNESS_A = 0.3;

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
