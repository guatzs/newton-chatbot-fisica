import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractQuickChipsFromResponse, isOutOfScopeResponse } from './outOfScope';

const DEFAULT_CHIPS = [
  'Dame un ejemplo paso a paso',
  '¿Qué fórmula se aplica?',
  'Ver constantes físicas',
] as const;

describe('isOutOfScopeResponse & extractQuickChipsFromResponse', () => {
  it('detecta la frase estándar de rechazo del sílabo', () => {
    const refusal =
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática, electrodinámica, magnetismo o fundamentos de electrónica. ¿Sobre cuál te gustaría preguntar?';
    assert.equal(isOutOfScopeResponse(refusal), true);
  });

  it('detecta variantes de rechazo sin tildes o con frase "fuera del alcance del curso"', () => {
    assert.equal(
      isOutOfScopeResponse('Lo siento, ese tema está fuera del alcance del curso.'),
      true
    );
    assert.equal(
      isOutOfScopeResponse('Ese tema no forma parte del silabo de Fisica Aplicada.'),
      true
    );
    assert.equal(
      isOutOfScopeResponse('Esa pregunta se encuentra fuera del sílabo de Física Aplicada.'),
      true
    );
  });

  it('no marca respuestas válidas de Física Aplicada como fuera de alcance', () => {
    assert.equal(
      isOutOfScopeResponse(
        'Para calcular la fuerza eléctrica usamos la Ley de Coulomb: $F = k \\cdot \\dfrac{|q_1 \\cdot q_2|}{r^2}$.'
      ),
      false
    );
    assert.equal(
      isOutOfScopeResponse(
        'En un circuito RC en corriente continua, la constante de tiempo es $\\tau = R \\cdot C$.'
      ),
      false
    );
  });

  it('omite por completo los chips por defecto cuando hay rechazo fuera del sílabo', () => {
    const refusal =
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática, electrodinámica, magnetismo o fundamentos de electrónica.';
    const result = extractQuickChipsFromResponse(refusal, DEFAULT_CHIPS);
    assert.equal(result.isOutOfScope, true);
    assert.deepEqual(result.quickChips, []);
    assert.equal(result.cleanText, refusal);
  });

  it('elimina la línea [SUGERENCIAS] y devuelve [] si el modelo incluyó chips junto a un rechazo', () => {
    const refusalWithChips =
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática.\n[SUGERENCIAS]: Dame un ejemplo paso a paso | ¿Qué fórmula se aplica?';
    const result = extractQuickChipsFromResponse(refusalWithChips, DEFAULT_CHIPS);
    assert.equal(result.isOutOfScope, true);
    assert.deepEqual(result.quickChips, []);
    assert.equal(
      result.cleanText,
      'Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática.'
    );
  });

  it('conserva las sugerencias generadas o aplica las por defecto en consultas válidas', () => {
    const validWithChips =
      'La Ley de Ohm establece $V = I \\cdot R$.\n[SUGERENCIAS]: Resolver circuito mixto | Calcular potencia';
    const parsed = extractQuickChipsFromResponse(validWithChips, DEFAULT_CHIPS);
    assert.equal(parsed.isOutOfScope, false);
    assert.deepEqual(parsed.quickChips, ['Resolver circuito mixto', 'Calcular potencia']);
    assert.equal(parsed.cleanText, 'La Ley de Ohm establece $V = I \\cdot R$.');

    const validWithoutChips = 'En un conductor en equilibrio electrostático, $E = 0$ en el interior.';
    const fallback = extractQuickChipsFromResponse(validWithoutChips, DEFAULT_CHIPS);
    assert.equal(fallback.isOutOfScope, false);
    assert.deepEqual(fallback.quickChips, [...DEFAULT_CHIPS]);
  });
});
