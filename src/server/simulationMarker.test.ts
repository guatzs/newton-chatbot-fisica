import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSimulacion } from './simulationMarker';

describe('parseSimulacion', () => {
  it('P1: parses coulomb marker cleanly and preserves remaining text order', () => {
    const res = parseSimulacion(
      'Explicación.\n[SIMULACION]: coulomb | q1=2 | q2=-3 | r=0.5\n[SUGERENCIAS]: a | b'
    );
    assert.equal(res.type, 'coulomb');
    assert.deepEqual(res.params, { q1: 2, q2: -3, r: 0.5 });
    assert.deepEqual(res.adjusted, []);
    assert.equal(res.cleanText, 'Explicación.\n[SUGERENCIAS]: a | b');
  });

  it('P2: clamps out-of-range high value q1=25 to 10 and records adjustment', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | q1=25');
    assert.equal(res.type, 'coulomb');
    assert.equal(res.params?.q1, 10);
    assert.deepEqual(res.adjusted, [{ key: 'q1', requested: 25, applied: 10 }]);
  });

  it('P3: accepts decimal comma r=0,5 without recording adjustment', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | r=0,5');
    assert.equal(res.params?.r, 0.5);
    assert.deepEqual(res.adjusted, []);
  });

  it('P4: discards non-numeric r=abc to default 0.5 and records adjustment', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | r=abc');
    assert.equal(res.params?.r, 0.5);
    assert.deepEqual(res.adjusted, [{ key: 'r', requested: 'abc', applied: 0.5 }]);
  });

  it('P5: clamps r=0 to min 0.2 and records adjustment (prevents division by zero)', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | r=0');
    assert.equal(res.params?.r, 0.2);
    assert.deepEqual(res.adjusted, [{ key: 'r', requested: 0, applied: 0.2 }]);
  });

  it('P6: fills omitted parameters for ohm with defaults without adjustment entries', () => {
    const res = parseSimulacion('[SIMULACION]: ohm | v=6');
    assert.equal(res.type, 'ohm');
    assert.deepEqual(res.params, { v: 6, res: 50 });
    assert.deepEqual(res.adjusted, []);
  });

  it('P7: discards unknown simulation id foo and strips the marker line from cleanText', () => {
    const res = parseSimulacion('Texto previo.\n[SIMULACION]: foo | x=1');
    assert.equal(res.type, undefined);
    assert.equal(res.cleanText, 'Texto previo.');
  });

  it('P8: handles case-insensitive tag, id, and keys', () => {
    const res = parseSimulacion('[simulacion]: COULOMB | Q1=2');
    assert.equal(res.type, 'coulomb');
    assert.deepEqual(res.params, { q1: 2, q2: -3, r: 0.5 });
  });

  it('P9: ignores valid marker when response is out-of-syllabus refusal', () => {
    const res = parseSimulacion(
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática.\n[SIMULACION]: coulomb | q1=2'
    );
    assert.equal(res.type, undefined);
    assert.equal(
      res.cleanText,
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática.'
    );
  });

  it('P10: returns undefined type and trimmed text when no marker exists', () => {
    const res = parseSimulacion('  Respuesta normal sin marcador.  ');
    assert.equal(res.type, undefined);
    assert.equal(res.cleanText, 'Respuesta normal sin marcador.');
  });

  it('P11: discards Infinity, NaN, and overflow 1e999 to default 0.5 with adjustment', () => {
    for (const bad of ['Infinity', 'NaN', '1e999']) {
      const res = parseSimulacion(`[SIMULACION]: coulomb | r=${bad}`);
      assert.equal(res.params?.r, 0.5);
      assert.deepEqual(res.adjusted, [{ key: 'r', requested: bad, applied: 0.5 }]);
    }
  });

  it('P12: discards marker lines longer than 200 characters', () => {
    const longLine = `[SIMULACION]: coulomb | q1=2 | ${'x'.repeat(200)}`;
    const res = parseSimulacion(`Hola\n${longLine}`);
    assert.equal(res.type, undefined);
    assert.equal(res.cleanText, 'Hola');
  });

  it('P13: skips invalid first marker line and uses second valid marker line, stripping both', () => {
    const res = parseSimulacion(
      'Explicación.\n[SIMULACION]: foo | x=1\n[SIMULACION]: ohm | v=3'
    );
    assert.equal(res.type, 'ohm');
    assert.deepEqual(res.params, { v: 3, res: 50 });
    assert.equal(res.cleanText, 'Explicación.');
  });

  it('P14: ignores unknown parameter key x=5 without recording adjustment', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | x=5 | q1=4');
    assert.equal(res.type, 'coulomb');
    assert.deepEqual(res.params, { q1: 4, q2: -3, r: 0.5 });
    assert.deepEqual(res.adjusted, []);
  });

  it('P15: preserves precision q1=2.55 without rounding to slider step', () => {
    const res = parseSimulacion('[SIMULACION]: coulomb | q1=2.55');
    assert.equal(res.params?.q1, 2.55);
    assert.deepEqual(res.adjusted, []);
  });

  it('P16: clamps negative voltage v=-1 and out-of-range resistance res=0.5 / res=1500 for ohm', () => {
    const low = parseSimulacion('[SIMULACION]: ohm | v=-1 | res=0.5');
    assert.equal(low.type, 'ohm');
    assert.deepEqual(low.params, { v: 0, res: 1 });
    assert.deepEqual(low.adjusted, [
      { key: 'v', requested: -1, applied: 0 },
      { key: 'res', requested: 0.5, applied: 1 },
    ]);

    const high = parseSimulacion('[SIMULACION]: ohm | v=12 | res=1500');
    assert.equal(high.type, 'ohm');
    assert.deepEqual(high.params, { v: 12, res: 1000 });
    assert.deepEqual(high.adjusted, [{ key: 'res', requested: 1500, applied: 1000 }]);
  });

  it('P17: accepts exact course resistances (1, 3, 4, 6, 12, 1000 Ω) without clamping', () => {
    for (const r of [1, 3, 4, 6, 12, 1000]) {
      const res = parseSimulacion(`[SIMULACION]: ohm | v=12 | res=${r}`);
      assert.equal(res.params?.res, r);
      assert.deepEqual(res.adjusted, []);
    }
  });
});
