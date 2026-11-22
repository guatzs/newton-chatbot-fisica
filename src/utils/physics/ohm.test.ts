import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bulbBrightness,
  currentArrowLengthPx,
  dotSpeedPxPerS,
  flowArrowScale,
  flowSpeedPxPerS,
  ohmCurrent,
  ohmPower,
  solveOhmCircuit,
} from './ohm';
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

describe('ohmCurrent & ohmPower', () => {
  it('O1: V = 6 V, R = 50 Ω -> I = 0.12 A, P = 0.72 W', () => {
    const i = ohmCurrent(6, 50);
    const p = ohmPower(6, 50);
    assertRelClose(i, 0.12);
    assertRelClose(p, 0.72);
    assert.equal(formatSci(i), '1.20 \u00D7 10\u207B\u00B9');
    assert.equal(formatSci(p), '7.20 \u00D7 10\u207B\u00B9');
  });

  it('O2: V = 12 V, R = 10 Ω -> I = 1.2 A, P = 14.4 W', () => {
    const i = ohmCurrent(12, 10);
    const p = ohmPower(12, 10);
    assertRelClose(i, 1.2);
    assertRelClose(p, 14.4);
    assert.equal(formatSci(p), '1.44 \u00D7 10\u00B9');
  });

  it('O3: V = 12 V, R = 500 Ω -> I = 0.024 A, P = 0.288 W', () => {
    const i = ohmCurrent(12, 500);
    const p = ohmPower(12, 500);
    assertRelClose(i, 0.024);
    assertRelClose(p, 0.288);
    assert.equal(formatSci(i), '2.40 \u00D7 10\u207B\u00B2');
    assert.equal(formatSci(p), '2.88 \u00D7 10\u207B\u00B9');
  });

  it('O4: V = 0 -> I = 0, P = 0, brightness 0, speed 0, arrow 0', () => {
    const i = ohmCurrent(0, 50);
    const p = ohmPower(0, 50);
    assert.equal(i, 0);
    assert.equal(p, 0);
    assert.equal(bulbBrightness(i), 0);
    assert.equal(dotSpeedPxPerS(i), 0);
    assert.equal(currentArrowLengthPx(i), 0);
  });

  it('O5: V = 1.5 V, R = 300 Ω -> I = 0.005 A, P = 0.0075 W', () => {
    const i = ohmCurrent(1.5, 300);
    const p = ohmPower(1.5, 300);
    assertRelClose(i, 0.005);
    assertRelClose(p, 0.0075);
    assert.equal(formatSci(i), '5.00 \u00D7 10\u207B\u00B3');
    assert.equal(formatSci(p), '7.50 \u00D7 10\u207B\u00B3');
  });

  it('O6: R <= 0, R = NaN, or V = Infinity throws RangeError', () => {
    assert.throws(() => ohmCurrent(6, 0), RangeError);
    assert.throws(() => ohmCurrent(6, -10), RangeError);
    assert.throws(() => ohmCurrent(6, Number.NaN), RangeError);
    assert.throws(() => ohmCurrent(Number.POSITIVE_INFINITY, 50), RangeError);
    assert.throws(() => ohmPower(6, 0), RangeError);
    assert.throws(() => ohmPower(Number.NaN, 50), RangeError);
  });

  it('O7: proportionality in V and inverse proportionality in R', () => {
    assertRelClose(ohmCurrent(12, 50), 2 * ohmCurrent(6, 50));
    assertRelClose(ohmCurrent(6, 100), ohmCurrent(6, 50) / 2);
  });

  it('O7b: exact course resistances across 1 Ω – 1000 Ω (1, 3, 4, 6, 12, 1000 Ω)', () => {
    assertRelClose(ohmCurrent(12, 1), 12);
    assertRelClose(ohmPower(12, 1), 144);
    assertRelClose(ohmCurrent(12, 3), 4);
    assertRelClose(ohmPower(12, 3), 48);
    assertRelClose(ohmCurrent(12, 4), 3);
    assertRelClose(ohmCurrent(12, 6), 2);
    assertRelClose(ohmCurrent(12, 12), 1);
    assertRelClose(ohmCurrent(12, 1000), 0.012);
    assertRelClose(ohmPower(12, 1000), 0.144);
  });
});

describe('solveOhmCircuit (Serie, Paralelo y Mixto)', () => {
  it('C1: Series circuit (1–4 resistors) satisfies Req = ΣRi, Ii = Itotal, ΣVi = V, ΣPi = P', () => {
    const res = solveOhmCircuit('series', 12, [
      { id: 'r1', label: 'R₁', resistance: 3 },
      { id: 'r2', label: 'R₂', resistance: 4 },
      { id: 'r3', label: 'R₃', resistance: 5 },
    ]);

    assertRelClose(res.equivalentResistance_ohm, 12);
    assertRelClose(res.totalCurrent_A, 1);
    assertRelClose(res.totalPower_W, 12);
    assert.equal(res.resistors.length, 3);
    assertRelClose(res.resistors[0].voltage_V, 3);
    assertRelClose(res.resistors[1].voltage_V, 4);
    assertRelClose(res.resistors[2].voltage_V, 5);
    assertRelClose(
      res.resistors.reduce((sum, r) => sum + r.voltage_V, 0),
      12
    );
    assertRelClose(
      res.resistors.reduce((sum, r) => sum + r.power_W, 0),
      res.totalPower_W
    );
  });

  it('C2: Parallel circuit (2–4 resistors) satisfies 1/Req = Σ(1/Ri), Vi = V, ΣIi = Itotal', () => {
    const res = solveOhmCircuit('parallel', 12, [
      { id: 'r1', label: 'R₁', resistance: 6 },
      { id: 'r2', label: 'R₂', resistance: 3 },
    ]);

    assertRelClose(res.equivalentResistance_ohm, 2);
    assertRelClose(res.totalCurrent_A, 6);
    assertRelClose(res.totalPower_W, 72);
    assertRelClose(res.resistors[0].voltage_V, 12);
    assertRelClose(res.resistors[0].current_A, 2);
    assertRelClose(res.resistors[1].voltage_V, 12);
    assertRelClose(res.resistors[1].current_A, 4);
    assertRelClose(
      res.resistors.reduce((sum, r) => sum + r.current_A, 0),
      res.totalCurrent_A
    );
  });

  it('C3: Parallel with 4 branches computes exact equivalent resistance and branch division', () => {
    const res = solveOhmCircuit('parallel', 24, [
      { id: 'r1', label: 'R₁', resistance: 12 },
      { id: 'r2', label: 'R₂', resistance: 12 },
      { id: 'r3', label: 'R₃', resistance: 6 },
      { id: 'r4', label: 'R₄', resistance: 4 },
    ]);

    // 1/Req = 1/12 + 1/12 + 2/12 + 3/12 = 7/12 -> Req = 12/7
    assertRelClose(res.equivalentResistance_ohm, 12 / 7);
    assertRelClose(res.totalCurrent_A, 14);
    assertRelClose(res.resistors[0].current_A, 2);
    assertRelClose(res.resistors[1].current_A, 2);
    assertRelClose(res.resistors[2].current_A, 4);
    assertRelClose(res.resistors[3].current_A, 6);
    assertRelClose(
      res.resistors.reduce((sum, r) => sum + r.power_W, 0),
      res.totalPower_W
    );
  });

  it('C4: Mixed circuit R1 + (R2 ∥ R3) satisfies KVL, KCL, and power conservation', () => {
    const res = solveOhmCircuit('mixed', 18, [
      { id: 'r1', label: 'R₁', resistance: 4 },
      { id: 'r2', label: 'R₂', resistance: 6 },
      { id: 'r3', label: 'R₃', resistance: 3 },
    ]);

    // R23 = (6*3)/(6+3) = 2 Ω, Req = 4 + 2 = 6 Ω, Itotal = 18/6 = 3 A
    // V1 = 12 V, V2 = V3 = 6 V, I2 = 1 A, I3 = 2 A
    assertRelClose(res.parallelGroupResistance_ohm ?? 0, 2);
    assertRelClose(res.equivalentResistance_ohm, 6);
    assertRelClose(res.totalCurrent_A, 3);
    assertRelClose(res.totalPower_W, 54);

    assertRelClose(res.resistors[0].voltage_V, 12);
    assertRelClose(res.resistors[0].current_A, 3);
    assertRelClose(res.resistors[1].voltage_V, 6);
    assertRelClose(res.resistors[1].current_A, 1);
    assertRelClose(res.resistors[2].voltage_V, 6);
    assertRelClose(res.resistors[2].current_A, 2);

    // KVL & KCL checks
    assertRelClose(res.resistors[0].voltage_V + res.resistors[1].voltage_V, 18);
    assertRelClose(res.resistors[1].current_A + res.resistors[2].current_A, res.resistors[0].current_A);
    assertRelClose(
      res.resistors.reduce((sum, r) => sum + r.power_W, 0),
      res.totalPower_W
    );
  });

  it('C5: Enforces topology resistor counts and positive finite values', () => {
    assert.throws(
      () => solveOhmCircuit('parallel', 12, [{ id: 'r1', label: 'R₁', resistance: 10 }]),
      RangeError
    );
    assert.throws(
      () =>
        solveOhmCircuit('mixed', 12, [
          { id: 'r1', label: 'R₁', resistance: 4 },
          { id: 'r2', label: 'R₂', resistance: 6 },
        ]),
      RangeError
    );
    assert.throws(
      () => solveOhmCircuit('series', -5, [{ id: 'r1', label: 'R₁', resistance: 10 }]),
      RangeError
    );
    assert.throws(
      () => solveOhmCircuit('series', 12, [{ id: 'r1', label: 'R₁', resistance: 0 }]),
      RangeError
    );
  });
});

describe('currentArrowLengthPx, dotSpeedPxPerS, flowSpeedPxPerS & bulbBrightness', () => {
  it('O8: arrow length within ±0.1 px', () => {
    assert.ok(Math.abs(currentArrowLengthPx(0.12) - 25.0) <= 0.1);
    assert.ok(Math.abs(currentArrowLengthPx(0.6) - 45.0) <= 0.1);
    assert.ok(Math.abs(currentArrowLengthPx(1.2) - 70.0) <= 0.1);
    assert.ok(Math.abs(currentArrowLengthPx(2) - 70.0) <= 0.1);
    assert.ok(Math.abs(currentArrowLengthPx(0.024) - 21.0) <= 0.1);
  });

  it('O9: dot speed within ±0.1 px/s', () => {
    assert.ok(Math.abs(dotSpeedPxPerS(0.12) - 38.0) <= 0.1);
    assert.ok(Math.abs(dotSpeedPxPerS(1.2) - 200.0) <= 0.1);
    assert.ok(Math.abs(dotSpeedPxPerS(0.024) - 23.6) <= 0.1);
  });

  it('O10: bulb brightness saturated at 1', () => {
    assertRelClose(bulbBrightness(0.12), 0.4);
    assertRelClose(bulbBrightness(0.024), 0.08);
    assert.equal(bulbBrightness(1.2), 1);
  });

  it('O11: flowSpeedPxPerS and flowArrowScale scale monotonically with current', () => {
    assert.equal(flowSpeedPxPerS(0), 0);
    assert.ok(flowSpeedPxPerS(0.01) > 0);
    assert.ok(flowSpeedPxPerS(1) > flowSpeedPxPerS(0.1));
    assert.ok(flowSpeedPxPerS(10) > flowSpeedPxPerS(1));

    assert.equal(flowArrowScale(0, 2), 0);
    assert.ok(flowArrowScale(2, 2) > flowArrowScale(1, 2));
    assert.ok(flowArrowScale(1, 2) > flowArrowScale(0.25, 2));
  });
});
