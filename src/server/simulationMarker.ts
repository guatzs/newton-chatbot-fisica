import { SIM_SPECS, ParameterizedSimulationId } from '../data/simulations';
import { SimulationAdjustment, SimulationParams, SimulationType } from '../types';

const MARKER_LINE_SCAN_RE = /^[^\S\r\n]*\[SIMULACI[OÓ]N\]:([^\n\r]*)/gim;
const MARKER_LINE_STRIP_RE = /^[^\S\r\n]*\[SIMULACI[OÓ]N\]:[^\n\r]*(?:\r?\n)?/gim;
const TOKEN_KV_RE = /^([a-z0-9_]+)\s*=\s*(.+)$/i;
const STRICT_NUMBER_RE = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;

const ACCEPTED_PASS_THROUGH_IDS: ReadonlySet<SimulationType> = new Set<SimulationType>([
  'conductor_gauss',
  'circuito_rc',
  'diodo_iv',
]);

function isParameterizedId(id: string): id is ParameterizedSimulationId {
  return id === 'coulomb' || id === 'ohm';
}

function isAcceptedPassThroughId(id: string): id is 'conductor_gauss' | 'circuito_rc' | 'diodo_iv' {
  return ACCEPTED_PASS_THROUGH_IDS.has(id as SimulationType);
}

export interface ParsedSimulationResult {
  cleanText: string;
  type?: SimulationType;
  params?: SimulationParams;
  adjusted: SimulationAdjustment[];
}

export function parseSimulacion(raw: string): ParsedSimulationResult {
  const matches = Array.from(raw.matchAll(MARKER_LINE_SCAN_RE));
  const cleanText = raw.replace(MARKER_LINE_STRIP_RE, '').trim();

  if (cleanText.toLowerCase().startsWith('ese tema no forma parte del sílabo')) {
    return {
      cleanText,
      adjusted: [],
    };
  }

  for (const match of matches) {
    const fullLine = match[0];
    if (fullLine.length > 200) {
      continue;
    }

    const payload = match[1] ?? '';
    const tokens = payload.split('|').map((t) => t.trim());
    const id = (tokens[0] ?? '').toLowerCase();

    if (!id) {
      continue;
    }

    if (isAcceptedPassThroughId(id)) {
      return {
        cleanText,
        type: id,
        adjusted: [],
      };
    }

    if (!isParameterizedId(id)) {
      continue;
    }

    const specs = SIM_SPECS[id];
    const specMap = new Map(specs.map((spec) => [spec.key, spec]));
    const parsedValues = new Map<string, number>();
    const adjusted: SimulationAdjustment[] = [];
    const seenKeys = new Set<string>();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      const kvMatch = token.match(TOKEN_KV_RE);
      if (!kvMatch) continue;

      const key = kvMatch[1].toLowerCase();
      const spec = specMap.get(key);
      if (!spec) {
        continue;
      }

      if (seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);

      const originalText = kvMatch[2].trim();
      const noSpaces = originalText.replace(/\s+/g, '');
      const normalized =
        !noSpaces.includes('.') && noSpaces.includes(',')
          ? noSpaces.replace(/,/g, '.')
          : noSpaces;

      if (!STRICT_NUMBER_RE.test(normalized)) {
        parsedValues.set(key, spec.default);
        adjusted.push({
          key,
          requested: originalText,
          applied: spec.default,
        });
        continue;
      }

      const num = Number(normalized);
      if (!Number.isFinite(num)) {
        parsedValues.set(key, spec.default);
        adjusted.push({
          key,
          requested: originalText,
          applied: spec.default,
        });
        continue;
      }

      if (num < spec.min || num > spec.max) {
        const clamped = Math.min(spec.max, Math.max(spec.min, num));
        parsedValues.set(key, clamped);
        adjusted.push({
          key,
          requested: num,
          applied: clamped,
        });
      } else {
        parsedValues.set(key, num);
      }
    }

    const params: SimulationParams = {};
    for (const spec of specs) {
      params[spec.key] = parsedValues.has(spec.key)
        ? (parsedValues.get(spec.key) as number)
        : spec.default;
    }

    return {
      cleanText,
      type: id,
      params,
      adjusted,
    };
  }

  return {
    cleanText,
    adjusted: [],
  };
}
