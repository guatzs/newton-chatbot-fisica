import {
  AIR_DIELECTRIC_STRENGTH_V_M,
  CM_TO_M,
  EPSILON_0,
  K_COULOMB,
  UC_TO_C,
} from './constants';

export type GaussZone = 'interior' | 'surface' | 'exterior';

export interface SphericalConductorInput {
  /** Carga neta del conductor en microcoulombs (µC). */
  charge_uC: number;
  /** Radio físico de la esfera conductora en centímetros (cm). */
  sphereRadius_cm: number;
  /** Radio de la superficie gaussiana concéntrica en centímetros (cm). */
  gaussianRadius_cm: number;
}

export interface SphericalConductorResult {
  zone: GaussZone;
  qEnc_C: number;
  qEnc_uC: number;
  flux_Nm2_C: number;
  field_N_C: number;
  field_kN_C: number;
  surfaceField_N_C: number;
  surfaceField_kN_C: number;
  potential_V: number;
  potential_kV: number;
  surfacePotential_V: number;
  surfacePotential_kV: number;
  sigma_uC_m2: number;
  exceedsAirDielectricStrength: boolean;
  fieldLineCount: number;
}

export const GAUSS_MAX_RADIUS_CM = 40;
export const GAUSS_MIN_SPHERE_RADIUS_CM = 8;
export const GAUSS_MAX_SPHERE_RADIUS_CM = 25;
export const GAUSS_MAX_ABS_CHARGE_UC = 10;

const ZONE_TOLERANCE_CM = 1e-6;

/**
 * Determina la zona electrostática comparando el radio gaussiano r con el radio conductor R.
 */
export function getGaussZone(gaussianRadius_cm: number, sphereRadius_cm: number): GaussZone {
  if (gaussianRadius_cm < sphereRadius_cm - ZONE_TOLERANCE_CM) {
    return 'interior';
  }
  if (Math.abs(gaussianRadius_cm - sphereRadius_cm) <= ZONE_TOLERANCE_CM) {
    return 'surface';
  }
  return 'exterior';
}

/**
 * Devuelve un radio gaussiano representativo (en pasos de 0.5 cm) para sincronizar botones de zona.
 */
export function representativeGaussianRadiusForZone(
  zone: GaussZone,
  sphereRadius_cm: number,
  maxRadius_cm: number = GAUSS_MAX_RADIUS_CM
): number {
  const snapHalf = (val: number) => Math.round(val * 2) / 2;

  if (zone === 'surface') {
    return Math.min(maxRadius_cm, Math.max(0, snapHalf(sphereRadius_cm)));
  }

  if (zone === 'interior') {
    const candidate = snapHalf(sphereRadius_cm * 0.6);
    if (candidate >= sphereRadius_cm) {
      return Math.max(0, snapHalf(sphereRadius_cm - 0.5));
    }
    return Math.max(0, candidate);
  }

  // exterior
  const candidate = Math.min(maxRadius_cm, snapHalf(sphereRadius_cm + 8));
  if (candidate <= sphereRadius_cm) {
    return Math.min(maxRadius_cm, snapHalf(sphereRadius_cm + 0.5));
  }
  return candidate;
}

/**
 * Calcula la cantidad de líneas radiales proporcional a |Q| (0 si Q = 0, hasta 20 para |Q| = 10 µC).
 */
export function computeFieldLineCount(
  charge_uC: number,
  maxAbsCharge_uC: number = GAUSS_MAX_ABS_CHARGE_UC,
  maxLines: number = 20
): number {
  const absQ = Math.abs(charge_uC);
  if (absQ < 1e-9 || maxAbsCharge_uC <= 0) {
    return 0;
  }
  const scaled = Math.round((absQ / maxAbsCharge_uC) * maxLines);
  return Math.min(maxLines, Math.max(2, scaled));
}

/**
 * Evalúa la Ley de Gauss y el potencial electrostático para una esfera conductora en equilibrio.
 * Usa k = 9e9 N·m²/C² y ε₀ = 8.85e-12 C²/(N·m²).
 */
export function evaluateSphericalConductor(
  input: SphericalConductorInput
): SphericalConductorResult {
  const safeSphereRadius_cm = Math.max(0.5, input.sphereRadius_cm);
  const safeGaussianRadius_cm = Math.max(0, input.gaussianRadius_cm);
  const charge_uC = Object.is(input.charge_uC, -0) ? 0 : input.charge_uC;

  const Q = charge_uC * UC_TO_C;
  const R = safeSphereRadius_cm * CM_TO_M;
  const r = safeGaussianRadius_cm * CM_TO_M;

  const zone = getGaussZone(safeGaussianRadius_cm, safeSphereRadius_cm);

  const surfaceArea_m2 = 4 * Math.PI * R * R;
  const sigma_uC_m2 = charge_uC / surfaceArea_m2;
  const surfaceField_N_C = (K_COULOMB * Math.abs(Q)) / (R * R);
  const surfaceField_kN_C = surfaceField_N_C / 1e3;
  const surfacePotential_V = (K_COULOMB * Q) / R;
  const surfacePotential_kV = surfacePotential_V / 1e3;

  let qEnc_C = 0;
  let qEnc_uC = 0;
  let flux_Nm2_C = 0;
  let field_N_C = 0;
  let potential_V = surfacePotential_V;

  if (zone === 'interior') {
    qEnc_C = 0;
    qEnc_uC = 0;
    flux_Nm2_C = 0;
    field_N_C = 0;
    potential_V = surfacePotential_V;
  } else if (zone === 'surface') {
    qEnc_C = Q;
    qEnc_uC = charge_uC;
    flux_Nm2_C = Q / EPSILON_0;
    field_N_C = surfaceField_N_C;
    potential_V = surfacePotential_V;
  } else {
    qEnc_C = Q;
    qEnc_uC = charge_uC;
    flux_Nm2_C = Q / EPSILON_0;
    field_N_C = (K_COULOMB * Math.abs(Q)) / (r * r);
    potential_V = (K_COULOMB * Q) / r;
  }

  return {
    zone,
    qEnc_C,
    qEnc_uC,
    flux_Nm2_C,
    field_N_C,
    field_kN_C: field_N_C / 1e3,
    surfaceField_N_C,
    surfaceField_kN_C,
    potential_V,
    potential_kV: potential_V / 1e3,
    surfacePotential_V,
    surfacePotential_kV,
    sigma_uC_m2,
    exceedsAirDielectricStrength: surfaceField_N_C > AIR_DIELECTRIC_STRENGTH_V_M,
    fieldLineCount: computeFieldLineCount(charge_uC),
  };
}

/**
 * Formatea el flujo eléctrico Φ_E en notación científica compacta legible.
 */
export function formatElectricFlux(flux_Nm2_C: number): string {
  if (Math.abs(flux_Nm2_C) < 1e-6) {
    return '0 N·m²/C';
  }
  const sign = flux_Nm2_C < 0 ? '−' : '+';
  const absVal = Math.abs(flux_Nm2_C);
  const exp = Math.floor(Math.log10(absVal));
  const mantissa = absVal / Math.pow(10, exp);
  const superscriptMap: Record<string, string> = {
    '-': '⁻',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };
  const expSup = String(exp)
    .split('')
    .map((ch) => superscriptMap[ch] ?? ch)
    .join('');

  return `${sign}${mantissa.toFixed(2)} × 10${expSup} N·m²/C`;
}
