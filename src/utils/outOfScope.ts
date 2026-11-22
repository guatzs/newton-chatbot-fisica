/**
 * Detección de respuestas de rechazo por temas fuera del sílabo de Física Aplicada
 * y extracción segura de chips de sugerencias rápidas.
 */

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /ese tema no forma parte del silabo/i,
  /no forma parte del silabo(?:\s+de\s+fisica\s+aplicada)?/i,
  /fuera del alcance del curso/i,
  /fuera del alcance de (?:los 4 modulos|fisica aplicada)/i,
  /fuera del silabo(?:\s+de\s+fisica\s+aplicada)?/i,
  /no pertenece al silabo(?:\s+de\s+fisica\s+aplicada)?/i,
  /no esta incluido en el silabo/i,
];

function normalizeSpanishText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Devuelve true cuando la respuesta del asistente corresponde a un rechazo
 * por consulta fuera del sílabo de Física Aplicada (Módulos 1 a 4).
 */
export function isOutOfScopeResponse(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normalized = normalizeSpanishText(trimmed);
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export interface ParsedQuickChipsResult {
  cleanText: string;
  quickChips: string[];
  isOutOfScope: boolean;
}

/**
 * Extrae y limpia la línea `[SUGERENCIAS]: chip1 | chip2 | ...` de la respuesta.
 * Si la respuesta es un rechazo fuera del sílabo, omite por completo las sugerencias
 * (tanto las generadas como las sugerencias por defecto).
 */
export function extractQuickChipsFromResponse(
  rawText: string,
  defaultChips: readonly string[]
): ParsedQuickChipsResult {
  let cleanText = rawText;
  let parsedChips: string[] = [];

  const chipsMatch = cleanText.match(/\[SUGERENCIAS\]:\s*([^\n\r]+)/i);
  if (chipsMatch) {
    const rawChips = chipsMatch[1];
    parsedChips = rawChips
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 50);
    cleanText = cleanText.replace(/\[SUGERENCIAS\]:\s*[^\n\r]+/i, '').trim();
  }

  const outOfScope = isOutOfScopeResponse(cleanText);
  if (outOfScope) {
    return {
      cleanText,
      quickChips: [],
      isOutOfScope: true,
    };
  }

  return {
    cleanText,
    quickChips: parsedChips.length > 0 ? parsedChips : [...defaultChips],
    isOutOfScope: false,
  };
}
