import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSci, formatSig } from './format';

describe('formatSci', () => {
  const cases: Array<[number, string]> = [
    [0.035952, '3.60 \u00D7 10\u207B\u00B2'],
    [0.215712, '2.16 \u00D7 10\u207B\u00B9'],
    [22.47, '2.25 \u00D7 10\u00B9'],
    [0.008988, '8.99 \u00D7 10\u207B\u00B3'],
    [0.00002247, '2.25 \u00D7 10\u207B\u2075'],
    [0.12, '1.20 \u00D7 10\u207B\u00B9'],
    [14.4, '1.44 \u00D7 10\u00B9'],
    [0.0075, '7.50 \u00D7 10\u207B\u00B3'],
    [-3e-6, '\u22123.00 \u00D7 10\u207B\u2076'],
    [0, '0'],
  ];

  for (const [input, expected] of cases) {
    it(`formats ${input} as "${expected}"`, () => {
      assert.equal(formatSci(input), expected);
    });
  }

  it('renormalizes when rounding pushes mantissa to 10.0', () => {
    assert.equal(formatSci(0.09996), '1.00 \u00D7 10\u207B\u00B9');
  });
});

describe('formatSig', () => {
  const cases: Array<[number, string]> = [
    [6, '6.00'],
    [50, '50.0'],
    [0.5, '0.500'],
    [500, '500'],
  ];

  for (const [input, expected] of cases) {
    it(`formats ${input} as "${expected}"`, () => {
      assert.equal(formatSig(input), expected);
    });
  }
});
