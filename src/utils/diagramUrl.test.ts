import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { looksSpanishPrompt } from './diagramUrl';

describe('looksSpanishPrompt', () => {
  it('detects Spanish prompts', () => {
    assert.equal(looksSpanishPrompt('Dibuja las líneas de campo eléctrico de un dipolo'), true);
    assert.equal(looksSpanishPrompt('circuito RC con resistencia y condensador'), true);
  });

  it('recognizes English prompts as non-Spanish', () => {
    assert.equal(
      looksSpanishPrompt('Schematic diagram of an RC circuit with resistor R and capacitor C, white background'),
      false
    );
  });
});
