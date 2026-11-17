import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPollinationsImageUrl, looksSpanishPrompt } from './diagramUrl';

describe('buildPollinationsImageUrl', () => {
  it('encodes prompt and appends width=1024, height=1024, nologo=true', () => {
    const url = buildPollinationsImageUrl('electric field lines of an electric dipole, white background');
    assert.equal(
      url,
      'https://image.pollinations.ai/prompt/electric%20field%20lines%20of%20an%20electric%20dipole%2C%20white%20background?width=1024&height=1024&nologo=true'
    );
  });

  it('normalizes extra whitespace before encoding', () => {
    const url = buildPollinationsImageUrl('  rc circuit   diagram  ');
    assert.equal(
      url,
      'https://image.pollinations.ai/prompt/rc%20circuit%20diagram?width=1024&height=1024&nologo=true'
    );
  });
});

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
