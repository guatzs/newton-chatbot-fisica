import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bulbBrightness,
  currentArrowLengthPx,
  dotSpeedPxPerS,
  ohmCurrent,
  ohmPower,
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
});

describe('currentArrowLengthPx, dotSpeedPxPerS & bulbBrightness', () => {
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
});
