import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  K_COULOMB,
  coulombForce,
  coulombNature,
  forceArrowLengthPx,
  fitPositions,
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

describe('coulombForce & coulombNature', () => {
  it('C1: q1 = q2 = 1 µC, r = 0.5 m -> 3.5952e-2 N, repulsiva', () => {
    const f = coulombForce(1e-6, 1e-6, 0.5);
    assertRelClose(f, 3.5952e-2);
    assert.equal(coulombNature(f), 'repulsiva');
    assert.equal(formatSci(f), '3.60 \u00D7 10\u207B\u00B2');
  });

  it('C2: q1 = 2 µC, q2 = -3 µC, r = 0.5 m -> -0.215712 N, atractiva', () => {
    const f = coulombForce(2e-6, -3e-6, 0.5);
    assertRelClose(f, -0.215712);
    assert.equal(coulombNature(f), 'atractiva');
    assert.equal(formatSci(Math.abs(f)), '2.16 \u00D7 10\u207B\u00B9');
  });

  it('C3: inverse square law at r = 1.0 m -> 8.988e-3 N = C1 / 4', () => {
    const c1 = coulombForce(1e-6, 1e-6, 0.5);
    const f = coulombForce(1e-6, 1e-6, 1.0);
    assertRelClose(f, 8.988e-3);
    assertRelClose(f, c1 / 4);
  });

  it('C4: q1 = q2 = 10 µC, r = 0.2 m -> 22.47 N', () => {
    const f = coulombForce(10e-6, 10e-6, 0.2);
    assertRelClose(f, 22.47);
    assert.equal(formatSci(f), '2.25 \u00D7 10\u00B9');
  });

  it('C5: q1 = q2 = 0.1 µC, r = 2.0 m -> 2.247e-5 N', () => {
    const f = coulombForce(0.1e-6, 0.1e-6, 2.0);
    assertRelClose(f, 2.247e-5);
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

  it('C9: linearity coulombForce(2e-6, 1e-6, 0.5) = 2 * C1 = 7.1904e-2 N', () => {
    const c1 = coulombForce(1e-6, 1e-6, 0.5);
    const f = coulombForce(2e-6, 1e-6, 0.5);
    assertRelClose(f, 2 * c1);
    assertRelClose(f, 7.1904e-2);
  });

  it('uses K_COULOMB = 8.988e9', () => {
    assert.equal(K_COULOMB, 8.988e9);
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
