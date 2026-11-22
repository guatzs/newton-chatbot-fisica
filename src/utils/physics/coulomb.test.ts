import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { K_COULOMB as CONSTANTS_K } from './constants';
import {
  K_COULOMB,
  calculateSuperposition2D,
  coulombForce,
  coulombNature,
  fitPositions,
  forceArrowLengthPx,
  PointCharge2D,
  vectorAngleDeg,
  vectorArrowLength2DPx,
} from './coulomb';
import { formatSci } from '../format';

function assertRelClose(actual: number, expected: number, relTol = 1e-9) {
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

describe('coulombForce & coulombNature (k = 9 × 10⁹)', () => {
  it('C1: q1 = q2 = 1 µC, r = 0.5 m -> 3.6e-2 N, repulsiva', () => {
    const f = coulombForce(1e-6, 1e-6, 0.5);
    assertRelClose(f, 3.6e-2);
    assert.equal(coulombNature(f), 'repulsiva');
    assert.equal(formatSci(f), '3.60 \u00D7 10\u207B\u00B2');
  });

  it('C2: q1 = 2 µC, q2 = -3 µC, r = 0.5 m -> -0.216 N, atractiva', () => {
    const f = coulombForce(2e-6, -3e-6, 0.5);
    assertRelClose(f, -0.216);
    assert.equal(coulombNature(f), 'atractiva');
    assert.equal(formatSci(Math.abs(f)), '2.16 \u00D7 10\u207B\u00B9');
  });

  it('C3: inverse square law at r = 1.0 m -> 9e-3 N = C1 / 4', () => {
    const c1 = coulombForce(1e-6, 1e-6, 0.5);
    const f = coulombForce(1e-6, 1e-6, 1.0);
    assertRelClose(f, 9e-3);
    assertRelClose(f, c1 / 4);
  });

  it('C4: q1 = q2 = 10 µC, r = 0.2 m -> 22.5 N', () => {
    const f = coulombForce(10e-6, 10e-6, 0.2);
    assertRelClose(f, 22.5);
    assert.equal(formatSci(f), '2.25 \u00D7 10\u00B9');
  });

  it('C5: q1 = q2 = 0.1 µC, r = 2.0 m -> 2.25e-5 N', () => {
    const f = coulombForce(0.1e-6, 0.1e-6, 2.0);
    assertRelClose(f, 2.25e-5);
    assert.equal(formatSci(f), '2.25 \u00D7 10\u207B\u2075');
  });

  it('C6: q1 = 0 -> coulombForce = 0 and coulombNature = nula', () => {
    const f = coulombForce(0, -3e-6, 0.5);
    assert.equal(f, 0);
    assert.equal(coulombNature(f), 'nula');
  });

  it('C7: r <= 0, NaN, or Infinity throws RangeError', () => {
    for (const badR of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.throws(() => coulombForce(1e-6, 1e-6, badR), RangeError);
    }
  });

  it('C8: symmetry coulombForce(a, b, r) === coulombForce(b, a, r)', () => {
    assert.equal(coulombForce(2.5e-6, -4.1e-6, 0.75), coulombForce(-4.1e-6, 2.5e-6, 0.75));
  });

  it('C9: linearity coulombForce(2e-6, 1e-6, 0.5) = 2 * C1 = 7.2e-2 N', () => {
    const c1 = coulombForce(1e-6, 1e-6, 0.5);
    const f = coulombForce(2e-6, 1e-6, 0.5);
    assertRelClose(f, 2 * c1);
    assertRelClose(f, 7.2e-2);
  });

  it('C10: nanocoulombs (nC) and centimeters (cm) conversions yield exact SI force', () => {
    // q1 = 5 nC, q2 = -3 nC, r = 5 cm = 0.05 m -> F = -9e9 * 15e-18 / 2.5e-3 = -5.4e-5 N
    const f = coulombForce(5e-9, -3e-9, 5e-2);
    assertRelClose(f, -5.4e-5);
    assert.equal(coulombNature(f), 'atractiva');
    assert.equal(formatSci(Math.abs(f)), '5.40 \u00D7 10\u207B\u2075');
  });

  it('uses unified K_COULOMB = 9e9 from constants.ts', () => {
    assert.equal(K_COULOMB, 9e9);
    assert.equal(K_COULOMB, CONSTANTS_K);
  });
});

describe('calculateSuperposition2D', () => {
  it('S1: computes exact 2D orthogonal superposition (right triangle)', () => {
    // Target q3 = +2 µC at (0, 0) cm
    // q1 = +3 µC at (-10, 0) cm -> repels q3 along +X: Fx = 9e9 * 6e-12 / 0.01 = 5.4 N
    // q2 = -4 µC at (0, 10) cm  -> attracts q3 along +Y: Fy = 9e9 * 8e-12 / 0.01 = 7.2 N
    // Net force = sqrt(5.4^2 + 7.2^2) = 9.0 N, angle = atan2(7.2, 5.4) ≈ 53.1301°
    const charges: PointCharge2D[] = [
      { id: 'q1', label: 'q₁', q: 3, unit: 'uC', x_cm: -10, y_cm: 0 },
      { id: 'q2', label: 'q₂', q: -4, unit: 'uC', x_cm: 0, y_cm: 10 },
      { id: 'q3', label: 'q₃', q: 2, unit: 'uC', x_cm: 0, y_cm: 0 },
    ];
    const res = calculateSuperposition2D(charges, 'q3');
    assert.equal(res.targetHasOverlap, false);
    assert.equal(res.overlappingPairs.length, 0);
    assert.equal(res.contributions.length, 2);
    assertRelClose(res.netFx, 5.4);
    assertRelClose(res.netFy, 7.2);
    assertRelClose(res.netMagnitude, 9.0);
    assertRelClose(res.netAngleDeg, (Math.atan2(7.2, 5.4) * 180) / Math.PI);
  });

  it('S2: cancels net force cleanly to exact zero under symmetric charges', () => {
    const charges: PointCharge2D[] = [
      { id: 'q1', label: 'q₁', q: 10, unit: 'nC', x_cm: -5, y_cm: 0 },
      { id: 'q2', label: 'q₂', q: 10, unit: 'nC', x_cm: 5, y_cm: 0 },
      { id: 'q3', label: 'q₃', q: -4, unit: 'nC', x_cm: 0, y_cm: 0 },
    ];
    const res = calculateSuperposition2D(charges, 'q3');
    assert.equal(res.netFx, 0);
    assert.equal(res.netFy, 0);
    assert.equal(res.netMagnitude, 0);
    assert.equal(res.netAngleDeg, 0);
  });

  it('S3: supports mixed nC and µC charges up to 5 charges', () => {
    const charges: PointCharge2D[] = [
      { id: 'q1', label: 'q₁', q: 1, unit: 'uC', x_cm: -10, y_cm: 0 },
      { id: 'q2', label: 'q₂', q: 1000, unit: 'nC', x_cm: 10, y_cm: 0 },
      { id: 'q3', label: 'q₃', q: 5, unit: 'nC', x_cm: 0, y_cm: 10 },
      { id: 'q4', label: 'q₄', q: -5, unit: 'nC', x_cm: 0, y_cm: -10 },
      { id: 'q5', label: 'q₅', q: 2, unit: 'nC', x_cm: 0, y_cm: 0 },
    ];
    const res = calculateSuperposition2D(charges, 'q5');
    // q1 (1 µC) and q2 (1000 nC = 1 µC) cancel along X
    // q3 (+5 nC at y=+10) repels q5 (+2 nC) toward -Y; q4 (-5 nC at y=-10) attracts q5 toward -Y
    // Each contributes Fy = -9e9 * 10e-18 / 0.01 = -9e-6 N -> netFy = -1.8e-5 N, angle = 270°
    assert.equal(res.contributions.length, 4);
    assert.equal(res.netFx, 0);
    assertRelClose(res.netFy, -1.8e-5);
    assertRelClose(res.netMagnitude, 1.8e-5);
    assertRelClose(res.netAngleDeg, 270);
  });

  it('S4: prevents division by zero and reports overlap when two charges coincide', () => {
    const charges: PointCharge2D[] = [
      { id: 'q1', label: 'q₁', q: 5, unit: 'nC', x_cm: 4, y_cm: -2 },
      { id: 'q2', label: 'q₂', q: -5, unit: 'nC', x_cm: 4, y_cm: -2 },
      { id: 'q3', label: 'q₃', q: 2, unit: 'nC', x_cm: 10, y_cm: -2 },
    ];
    const res = calculateSuperposition2D(charges, 'q1');
    assert.equal(res.targetHasOverlap, true);
    assert.equal(res.overlappingPairs.length, 1);
    assert.equal(res.overlappingPairs[0].aId, 'q1');
    assert.equal(res.overlappingPairs[0].bId, 'q2');
    assert.ok(Number.isFinite(res.netFx) && Number.isFinite(res.netFy) && Number.isFinite(res.netMagnitude));
    const q2Contrib = res.contributions.find((c) => c.sourceId === 'q2');
    assert.equal(q2Contrib?.overlapping, true);
    assert.equal(q2Contrib?.magnitude, 0);
  });

  it('S5: computes standard polar angles in [0, 360) for all quadrants', () => {
    assert.equal(vectorAngleDeg(1, 0), 0);
    assert.equal(vectorAngleDeg(0, 1), 90);
    assert.equal(vectorAngleDeg(-1, 0), 180);
    assert.equal(vectorAngleDeg(0, -1), 270);
    assertRelClose(vectorAngleDeg(1, 1), 45);
    assertRelClose(vectorAngleDeg(-1, 1), 135);
    assertRelClose(vectorAngleDeg(-1, -1), 225);
    assertRelClose(vectorAngleDeg(1, -1), 315);
  });

  it('S6: scales 2D vector arrows in both linear and logarithmic modes', () => {
    assert.equal(vectorArrowLength2DPx(0, 10, 'linear'), 0);
    assert.equal(vectorArrowLength2DPx(0, 10, 'logarithmic'), 0);
    assertRelClose(vectorArrowLength2DPx(10, 10, 'linear', 22, 100), 100);
    assertRelClose(vectorArrowLength2DPx(5, 10, 'linear', 22, 100), 50);
    const smallLog = vectorArrowLength2DPx(1e-7, 1, 'logarithmic', 22, 104);
    const largeLog = vectorArrowLength2DPx(1, 1, 'logarithmic', 22, 104);
    assert.ok(smallLog >= 22 && largeLog > smallLog && largeLog <= 104);
  });
});

describe('forceArrowLengthPx', () => {
  it('computes expected logarithmic lengths within ±0.1 px', () => {
    assert.equal(forceArrowLengthPx(0), 0);

    const c1 = coulombForce(1e-6, 1e-6, 0.5);
    assert.ok(Math.abs(forceArrowLengthPx(c1) - 45.4) <= 0.1);

    const c4 = coulombForce(10e-6, 10e-6, 0.2);
    assert.ok(Math.abs(forceArrowLengthPx(c4) - 65.4) <= 0.1);

    const c5 = coulombForce(0.1e-6, 0.1e-6, 2.0);
    assert.ok(Math.abs(forceArrowLengthPx(c5) - 22.5) <= 0.1);

    assert.equal(forceArrowLengthPx(100), 70);
    assert.equal(forceArrowLengthPx(-250), 70);
    assert.equal(forceArrowLengthPx(1e-5), 20);
    assert.equal(forceArrowLengthPx(-1e-8), 20);
  });
});

describe('fitPositions', () => {
  it('centers and clamps positions inside [0.4, 2.6] m preserving separation r', () => {
    const p1 = fitPositions(1.5, 0.5);
    assertRelClose(p1.x1_m, 1.25, 1e-12);
    assertRelClose(p1.x2_m, 1.75, 1e-12);

    const p2 = fitPositions(0.4, 2.0);
    assertRelClose(p2.x1_m, 0.4, 1e-12);
    assertRelClose(p2.x2_m, 2.4, 1e-12);

    const p3 = fitPositions(2.6, 2.0);
    assertRelClose(p3.x1_m, 0.6, 1e-12);
    assertRelClose(p3.x2_m, 2.6, 1e-12);

    for (const r of [0.2, 0.5, 1.37, 2.0]) {
      for (const mid of [0.0, 0.4, 1.5, 2.6, 3.0]) {
        const res = fitPositions(mid, r);
        assert.ok(res.x1_m >= 0.4 - 1e-12 && res.x2_m <= 2.6 + 1e-12);
        assert.ok(Math.abs(res.x2_m - res.x1_m - r) < 1e-12);
      }
    }
  });
});
