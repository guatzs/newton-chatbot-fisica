import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIR_DIELECTRIC_STRENGTH_V_M, EPSILON_0, K_COULOMB } from './constants';
import {
  computeFieldLineCount,
  evaluateSphericalConductor,
  formatElectricFlux,
  getGaussZone,
  representativeGaussianRadiusForZone,
} from './gauss';

function assertRelClose(actual: number, expected: number, relTol = 1e-6) {
  if (expected === 0) {
    assert.equal(actual, 0);
    return;
  }
  const relErr = Math.abs(actual - expected) / Math.abs(expected);
  assert.ok(
    relErr <= relTol,
    `Expected ${actual} to be within relTol=${relTol} of ${expected} (relErr=${relErr})`
  );
}

describe('evaluateSphericalConductor (Ley de Gauss)', () => {
  it('G1: usa las constantes unificadas k = 9e9 y ε₀ = 8.85e-12', () => {
    assert.equal(K_COULOMB, 9e9);
    assert.equal(EPSILON_0, 8.85e-12);
    assert.equal(AIR_DIELECTRIC_STRENGTH_V_M, 3e6);
  });

  it('G2: en el interior (r < R) da Q_enc = 0, Φ_E = 0, E = 0 y potencial constante V(R)', () => {
    const res = evaluateSphericalConductor({
      charge_uC: 4.5,
      sphereRadius_cm: 15,
      gaussianRadius_cm: 9,
    });

    assert.equal(res.zone, 'interior');
    assert.equal(res.qEnc_C, 0);
    assert.equal(res.qEnc_uC, 0);
    assert.equal(res.flux_Nm2_C, 0);
    assert.equal(res.field_N_C, 0);
    assert.equal(res.field_kN_C, 0);
    // V(R) = 9e9 * 4.5e-6 / 0.15 = 270,000 V = 270 kV
    assertRelClose(res.potential_kV, 270);
    assertRelClose(res.potential_kV, res.surfacePotential_kV);
    // E_surface = 9e9 * 4.5e-6 / 0.15^2 = 1.8e6 N/C = 1800 kN/C < 3000 kN/C
    assertRelClose(res.surfaceField_kN_C, 1800);
    assert.equal(res.exceedsAirDielectricStrength, false);
  });

  it('G3: funciona correctamente en r = 0 cm sin división por cero', () => {
    const res = evaluateSphericalConductor({
      charge_uC: -5,
      sphereRadius_cm: 10,
      gaussianRadius_cm: 0,
    });

    assert.equal(res.zone, 'interior');
    assert.equal(res.field_N_C, 0);
    assert.equal(res.flux_Nm2_C, 0);
    assertRelClose(res.potential_kV, -450);
    assert.equal(Number.isFinite(res.potential_kV), true);
  });

  it('G4: en el borde (r = R) calcula Q_enc = Q, Φ_E = Q/ε₀, E(R+) y V(R)', () => {
    const res = evaluateSphericalConductor({
      charge_uC: 4.5,
      sphereRadius_cm: 15,
      gaussianRadius_cm: 15,
    });

    assert.equal(res.zone, 'surface');
    assert.equal(res.qEnc_uC, 4.5);
    assertRelClose(res.flux_Nm2_C, 4.5e-6 / 8.85e-12);
    assertRelClose(res.field_kN_C, 1800);
    assertRelClose(res.potential_kV, 270);
  });

  it('G5: en el exterior (r = 2R) verifica decaimiento 1/r² en E(r) y 1/r en V(r)', () => {
    const atSurface = evaluateSphericalConductor({
      charge_uC: 6,
      sphereRadius_cm: 15,
      gaussianRadius_cm: 15,
    });
    const atDouble = evaluateSphericalConductor({
      charge_uC: 6,
      sphereRadius_cm: 15,
      gaussianRadius_cm: 30,
    });

    assert.equal(atDouble.zone, 'exterior');
    assert.equal(atDouble.qEnc_uC, 6);
    assertRelClose(atDouble.flux_Nm2_C, atSurface.flux_Nm2_C);
    assertRelClose(atDouble.field_kN_C, atSurface.field_kN_C / 4);
    assertRelClose(atDouble.potential_kV, atSurface.potential_kV / 2);
  });

  it('G6: activa la alerta de descarga corona cuando E_superficie > 3000 kN/C (3 MV/m)', () => {
    const highField = evaluateSphericalConductor({
      charge_uC: 10,
      sphereRadius_cm: 15,
      gaussianRadius_cm: 35,
    });
    assertRelClose(highField.surfaceField_kN_C, 4000);
    assert.equal(highField.exceedsAirDielectricStrength, true);

    const safeField = evaluateSphericalConductor({
      charge_uC: -3,
      sphereRadius_cm: 10,
      gaussianRadius_cm: 10,
    });
    assertRelClose(safeField.surfaceField_kN_C, 2700);
    assert.equal(safeField.exceedsAirDielectricStrength, false);
  });

  it('G7: escala líneas de campo entre 0 (Q=0) y 20 (|Q|=10 µC)', () => {
    assert.equal(computeFieldLineCount(0), 0);
    assert.equal(computeFieldLineCount(0.5), 2);
    assert.equal(computeFieldLineCount(5), 10);
    assert.equal(computeFieldLineCount(-5), 10);
    assert.equal(computeFieldLineCount(10), 20);
    assert.equal(computeFieldLineCount(-10), 20);
  });

  it('G8: sincroniza correctamente los radios representativos de zona con getGaussZone', () => {
    for (const R of [8, 15, 25]) {
      const rInt = representativeGaussianRadiusForZone('interior', R);
      const rSurf = representativeGaussianRadiusForZone('surface', R);
      const rExt = representativeGaussianRadiusForZone('exterior', R);

      assert.equal(getGaussZone(rInt, R), 'interior');
      assert.equal(getGaussZone(rSurf, R), 'surface');
      assert.equal(getGaussZone(rExt, R), 'exterior');
      assert.equal(rInt % 0.5, 0);
      assert.equal(rSurf % 0.5, 0);
      assert.equal(rExt % 0.5, 0);
    }
  });

  it('G9: formatea el flujo eléctrico en notación científica clara', () => {
    assert.equal(formatElectricFlux(0), '0 N·m²/C');
    assert.equal(formatElectricFlux(4.5e-6 / 8.85e-12), '+5.08 × 10⁵ N·m²/C');
    assert.equal(formatElectricFlux(-4.5e-6 / 8.85e-12), '−5.08 × 10⁵ N·m²/C');
  });
});
