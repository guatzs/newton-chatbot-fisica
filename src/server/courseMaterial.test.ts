import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCourseMaterialPromptSection,
  getAvailableCourseSources,
  loadCourseMaterial,
} from './courseMaterial';

describe('courseMaterial', () => {
  it('loads the verbatim course material markdown from disk', () => {
    const content = loadCourseMaterial();
    assert.ok(content.length > 100_000, 'Expected full course material (~119 KB)');
    assert.ok(content.includes('# MATERIAL DEL CURSO: FÍSICA APLICADA'));
    assert.ok(content.includes('m es 0.5'));
    assert.ok(content.includes('3.94×10¹⁴'));
  });

  it('extracts all 18 # FUENTE headers accurately', () => {
    const sources = getAvailableCourseSources();
    assert.equal(sources.length, 18);
    assert.ok(sources.includes('SEMANA 1_Campo_electrico_fuerza_electrica.pptx'));
    assert.ok(sources.includes('Electrostica_Fis_aplicada.pdf'));
    assert.ok(sources.includes('LEY DE COULOMB.pdf'));
    assert.ok(sources.includes('SEMANA 12 - CORRIENTE ALTERNA. F.A.pptx'));
    assert.ok(sources.includes('SEMANA 13 - Circuitos RLC.pptx'));
    assert.ok(sources.includes('Laboratorio Semana 10 - Física Aplicada.docx'));
    assert.ok(sources.includes('Sim_parcial_2026-2_2.pdf'));
  });

  it('formats rules 1-9 and wraps material in read-only data delimiters', () => {
    const promptSection = formatCourseMaterialPromptSection();
    assert.ok(promptSection.includes('FUENTE DE VERDAD: MATERIAL DEL CURSO'));
    assert.ok(promptSection.includes('1. PRIORIDAD'));
    assert.ok(promptSection.includes('9. ALCANCE'));
    assert.ok(promptSection.includes('<MATERIAL_DEL_CURSO_DATOS_SOLO_LECTURA>'));
    assert.ok(promptSection.includes('</MATERIAL_DEL_CURSO_DATOS_SOLO_LECTURA>'));
  });
});
