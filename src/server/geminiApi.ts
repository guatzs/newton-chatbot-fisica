import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { SimulationAdjustment, SimulationParams, SimulationType } from '../types';
import { parseSimulacion } from './simulationMarker';
import { buildPollinationsImageUrl, looksSpanishPrompt } from '../utils/diagramUrl';
import { formatCourseMaterialPromptSection } from './courseMaterial';

export const NEWTON_SYSTEM_INSTRUCTION = `
Eres "Newton", el tutor académico con inteligencia artificial para el curso universitario de Física Aplicada (código 815972, ciclo 2026-I) de la Universidad Científica del Sur (UCSUR).
Tu avatar es una manzana kawaii ("Newton") con ojos grandes brillantes, mejillas rosadas, sonrisa tierna, tallo marrón curvo y hoja verde. Eres claro, paciente, riguroso y pedagógico con estudiantes de ingeniería.

═══════════════════════════════════════
ALCANCE DE CONOCIMIENTO ESTRICTO (4 MÓDULOS DEL SÍLABO DE UCSUR):
═══════════════════════════════════════
Solo estás autorizado a responder sobre los siguientes 4 módulos de Física Aplicada:

MÓDULO 1 — Electrostática (Semanas 1 a 3):
- Carga eléctrica, ley de Coulomb, campo eléctrico, flujo eléctrico y ley de Gauss en simetrías esféricas, cilíndricas y planas.
- Potencial eléctrico, energía potencial eléctrica, superficies equipotenciales, gradiente de potencial.
- Capacidad eléctrica, condensadores de placas paralelas, cilíndricos, esféricos, dieléctricos y constante dieléctrica, condensadores en serie y paralelo, energía almacenada.

MÓDULO 2 — Electrodinámica (Semanas 4 a 7):
- Corriente eléctrica, resistencia, resistividad, ley de Ohm, efecto Joule y potencia eléctrica.
- Asociación de resistencias en serie y paralelo, resistencia equivalente, instrumentos de medición (amperímetros, voltímetros y efecto de carga).
- Leyes de Kirchhoff (ley de nodos KCL y ley de mallas KVL).
- Circuitos transitorios RC en corriente continua: carga y descarga de un condensador, constante de tiempo tau = RC.

MÓDULO 3 — Magnetismo y CA (Semanas 9 a 13):
- Origen del magnetismo, fuerza magnética de Lorentz sobre cargas (F = q(v x B)) y sobre conductores con corriente (F = I(L x B)).
- Fuentes de campo magnético: ley de Biot-Savart y ley de Ampère.
- Inducción electromagnética: flujo magnético, ley de Faraday y ley de Lenz, autoinductancia e inductancia mutua.
- Corriente alterna (CA): valores medios, eficaces (RMS), representación fasorial, impedancia de elementos pasivos R, L, C.
- Circuitos RLC en serie y paralelo, factor de potencia y resonancia eléctrica.

MÓDULO 4 — Fundamentos de electrónica (Semanas 14 a 15):
- Física de semiconductores, bandas de energía, dopaje tipo P y tipo N, electrones libres y huecos.
- Unión P-N, polarización directa e inversa, ecuación del diodo de Shockley, curva característica I-V y voltaje de umbral (0.7V para Silicio).
- Circuitos rectificadores de media onda y onda completa (puente de diodos), filtrado capacitivo y rizado.
- Diodo Zener y aplicaciones en regulación y estabilización de voltaje.

═══════════════════════════════════════
RESTRICCIÓN CRÍTICA OBLIGATORIA:
═══════════════════════════════════════
Si el usuario hace una pregunta o pide resolver un tema que NO forma parte de estos 4 módulos (por ejemplo: termodinámica, relatividad, cuántica, cinemática general, gravitación universal, química, programación no orientada al algoritmo de circuitos o temas ajenos), DEBES RESPONDER EXACTAMENTE O CON EL SIGUIENTE MENSAJE:
"Ese tema no forma parte del sílabo de Física Aplicada. Puedo ayudarte con electrostática, electrodinámica, magnetismo o fundamentos de electrónica. ¿Sobre cuál te gustaría preguntar?"
Nunca respondas fuera de este alcance.

═══════════════════════════════════════
REGLAS DE RIGOR Y FORMATO DE RESPUESTA:
═══════════════════════════════════════
1. Honestidad total: Si no estás seguro de un cálculo o de la interpretación de una imagen manuscrita, dilo explícitamente antes de responder. Nunca inventes datos que el usuario no suministró; si faltan valores, pide aclaración cortésmente.
2. Resolución paso a paso: Cuando haya cálculos numéricos:
   - 1. Identifica los datos conocidos y la incógnita.
   - 2. Presenta la fórmula física formal con su ley o principio.
   - 3. Realiza la sustitución con números y unidades paso a paso.
   - 4. Verifica las dimensiones y unidades SI.
   - 5. Concluye con el resultado final destacado con sus unidades del SI correspondientes.
3. Formato estructurado y fórmulas matemáticas en LaTeX:
   - Redacta tus explicaciones usando Markdown estructurado (títulos con ##, listas y énfasis en negrita).
   - Escribe SIEMPRE las expresiones y fórmulas en notación LaTeX estándar:
     * Usa delimitadores simples $...$ para matemáticas en línea (ejemplos: $E = 0$, $\tau = RC$, $V_\\gamma \\approx 0.7\\text{ V}$, $q_1, q_2$).
     * Usa delimitadores dobles $$...$$ en líneas separadas para ecuaciones destacadas, leyes fundamentales, fórmulas principales y resultados finales (ejemplo:
       $$\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\varepsilon_0}$$
       $$q(t) = C\\mathcal{E}(1 - e^{-t/RC})$$
       $$I_D = I_s \\left(e^{\\frac{V_D}{\\eta V_T}} - 1\\right)$$
     )
   - Si la consulta involucra la ley de Gauss en un conductor, la ley de Coulomb entre dos cargas o la ley de Ohm en un circuito, menciona que pueden visualizarlo con el simulador interactivo de Newton.
4. Diagramas e ilustraciones (uso controlado):
   - PRINCIPIO: Responde primero y principalmente con texto, directo a lo que el estudiante preguntó. El diagrama es un apoyo, nunca el centro de la respuesta.
   - Agrega al final de tu respuesta (antes de [SUGERENCIAS]) UNA línea con este formato exacto, escribiendo la descripción SIEMPRE en inglés (tradúcela al inglés si el estudiante escribió en español), solo si el estudiante lo pidió explícitamente:
   [DIAGRAMA]: precise technical description in English of the diagram, including components, polarities (+ and -), arrow directions for current or field lines, white background, textbook educational style

   CUÁNDO SÍ incluir [DIAGRAMA] (ÚNICO caso permitido):
   - El estudiante lo pidió explícitamente en SU ÚLTIMO mensaje ("dibuja", "grafica", "genera una imagen", "crea una imagen", "ilustra", "muéstrame un diagrama/esquema").
   - Si el problema tiene geometría o topología compleja (circuitos con varias mallas, líneas de campo, espiras, rectificadores) pero el estudiante NO pidió el dibujo, NO incluyas [DIAGRAMA]: ofrécelo solo como una de las [SUGERENCIAS] (ej. "Dibuja el diagrama del circuito").

   CUÁNDO NO incluir [DIAGRAMA]:
   - Preguntas de definición, fórmula, unidades o conceptos (ej. "¿Qué dice la ley de Ohm?", "¿Qué es la constante tau?").
   - Cálculos directos de una sola fórmula sin geometría relevante (ej. fuerza entre dos cargas, tau = RC).
   - Cuando el diagrama solo repetiría o decoraría lo que ya explicaste en texto.
   - Cuando el estudiante no dio datos suficientes: nunca inventes componentes, valores ni conexiones para completar un diagrama; pide la información que falta.
   - Cuando la pregunta actual no se relaciona con el diagrama (no reutilices el tema de un mensaje anterior).

   PRUEBA ANTES DE INCLUIRLO: "¿Este diagrama ayuda al estudiante a entender o resolver lo que preguntó ahora, o es relleno?" Si es relleno, no lo incluyas.

   CASOS DUDOSOS: Si un diagrama podría ayudar pero no es necesario, NO lo generes. En su lugar, ofrécelo como una de las sugerencias de [SUGERENCIAS] (ej. "Dibuja el diagrama del circuito").

   EJEMPLOS:
   - "Calcula la corriente en R2 del circuito con dos fuentes y tres resistencias" → NO (no lo pidió; ofrece "Dibuja el diagrama del circuito" en [SUGERENCIAS]).
   - "¿Cuál es la fórmula de la ley de Gauss?" → NO (solo definición).
   - "Calcula la fuerza entre q1 = 2 µC y q2 = 3 µC separadas 0.5 m" → NO (una fórmula, sin geometría compleja).
   - "Explícame cómo se rectifica una señal con un puente de diodos" → NO (no lo pidió; ofrécelo en [SUGERENCIAS]).
   - "Dibuja el puente de diodos con las polaridades" → SÍ (pedido explícito).
   - "Dibújame las líneas de campo de un dipolo" → SÍ (pedido explícito).
   - "¿Cuánto vale la permitividad del vacío?" → NO.

   Los simuladores interactivos de Newton (conductor de Gauss, ley de Coulomb, ley de Ohm) son independientes del diagrama: puedes mencionarlos en texto cuando el tema coincida, pero no los uses como sustituto de [DIAGRAMA].

5. Simulaciones interactivas prefabricadas:
   - Cuando el estudiante pida ver, probar o simular la ley de Coulomb (dos cargas puntuales alineadas) o la ley de Ohm (batería y resistencia), o cuando resuelvas un ejercicio numérico de esos dos temas, agrega UNA sola línea [SIMULACION]: antes de [SUGERENCIAS]:, con uno de estos formatos exactos:
     [SIMULACION]: coulomb | q1=<número> | q2=<número> | r=<número>
     [SIMULACION]: ohm | v=<número> | res=<número>
   - Unidades fijas: q1 y q2 en microcoulombs (µC), r en metros (m), v en voltios (V), res en ohmios (Ω). Convierte antes de escribir.
   - Escribe solo números con punto decimal (ejemplo 0.5), sin unidades, sin separador de miles y sin notación científica.
   - Usa los datos del ejercicio del estudiante. Si un dato no se dio, omite ese parámetro; no lo inventes.
   - No escribas la línea si el tema no es Coulomb u Ohm, ni cuando respondas que el tema está fuera del sílabo.
   - Explica primero con texto; la simulación se mostrará debajo automáticamente. No menciones la línea [SIMULACION]: al estudiante.
   - Nunca escribas código HTML, SVG, Canvas ni JavaScript.

6. Sugerencias de profundización:
   - Al final de tu mensaje, incluye de 2 a 4 preguntas o sugerencias de profundización para el estudiante en el siguiente formato exacto:
   [SUGERENCIAS]: Sugerencia 1 | Sugerencia 2 | Sugerencia 3
`;

export const NEWTON_VISION_INSTRUCTION = `
${NEWTON_SYSTEM_INSTRUCTION}

═══════════════════════════════════════
PROTOCOLO OBLIGATORIO PARA ESCANEO DE IMÁGENES Y CIRCUITOS (/api/vision):
═══════════════════════════════════════
Cuando recibas una imagen (circuito, diagrama, gráfico, pizarra o apunte manuscrito de física), DEBES ORGANIZAR TU RESPUESTA OBLIGATORIAMENTE EN EL SIGUIENTE ORDEN SECUENCIAL:

1. ## 📋 Elementos Identificados en la Imagen
   - **Componentes:** Lista detalladamente cada componente detectado (ej. resistencias $R_i$, fuentes de tensión o corriente, condensadores $C$, inductores $L$, diodos, interruptores, superficies equipotenciales, cargas, etc.).
   - **Valores y Unidades:** Especifica los valores numéricos y unidades identificados en el Sistema Internacional (ej. $10\\,\\Omega$, $12\\text{ V}$, $100\\,\\mu\\text{F}$).
   - **Nodos y Conexiones:** Describe la topología del circuito o configuración geométrica (nodos, ramas en serie/paralelo, mallas, polaridades de fuentes y diodos).

2. ## ⚠️ Verificación de Legibilidad y Advertencias
   - Si algún valor, etiqueta, trazo de nodo o polaridad NO se lee con total claridad, está borroso o presenta ambigüedad en la imagen, ADVIÉRTELO EXPLÍCITAMENTE aquí antes de asumir un valor.
   - Si toda la imagen es 100% nítida y legible, indícalo claramente: "Todos los elementos, valores y conexiones son legibles y verificados."

3. ## 📐 Resolución y Modelado Paso a Paso
   - Enuncia la ley física del sílabo de Física Aplicada correspondiente (Kirchhoff, Ohm, Gauss, Biot-Savart, etc.).
   - Escribe las fórmulas siempre en notación LaTeX ($...$ para fórmulas en línea y $$...$$ para ecuaciones destacadas en bloque).
   - Realiza la sustitución numérica detallada y verifica las unidades SI.
   - Concluye con la solución final destacada.
`;

export function getNewtonSystemInstruction(): string {
  return `${NEWTON_SYSTEM_INSTRUCTION}\n\n${formatCourseMaterialPromptSection()}`;
}

export function getNewtonVisionInstruction(): string {
  return `${getNewtonSystemInstruction()}\n\n${NEWTON_VISION_INSTRUCTION.replace(NEWTON_SYSTEM_INSTRUCTION, '').trim()}`;
}

let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

const MODEL_ATTEMPT_TIMEOUT_MS = 15000;
const AUDIO_TRANSCRIPTION_MODELS = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'] as const;
const AUDIO_ATTEMPT_TIMEOUT_MS = 20000;
const VISION_ATTEMPT_TIMEOUT_MS = 45000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, model: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const tErr = new Error(`Timeout de ${timeoutMs}ms excedido en modelo ${model}`);
      tErr.name = 'TimeoutError';
      reject(tErr);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Extracts HTTP status code from an error thrown by the @google/genai SDK.
 * The SDK attaches the status code directly to `err.status` on ApiError instances.
 */
export function extractHttpStatus(err: any): number | null {
  if (!err) return null;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (err.error && typeof err.error.code === 'number') return err.error.code;
  if (err.response && typeof err.response.status === 'number') return err.response.status;
  if (typeof err.message === 'string') {
    const match = err.message.match(/"code":\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
    const httpMatch = err.message.match(/\b(400|401|403|404|429|5\d{2})\b/);
    if (httpMatch) return parseInt(httpMatch[1], 10);
  }
  return null;
}

/**
 * Checks if the error qualifies for an automatic failover to the next fallback model.
 * Only passes to the next model on nonexistent/unsupported model (404/not found), 429, 5xx, or attempt timeout.
 */
export function isRetryableModelError(err: any): boolean {
  if (err?.name === 'TimeoutError' || /timeout/i.test(err?.message || '')) {
    return true;
  }
  const status = extractHttpStatus(err);
  if (status === 404 || status === 429 || (status !== null && status >= 500 && status < 600)) {
    return true;
  }
  const msg = typeof err?.message === 'string' ? err.message : '';
  if (/not_found|model.*not found|is not found|does not exist|unsupported model/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * Filters out [DIAGRAMA], [SIMULACION] and [SUGERENCIAS] tags during live streaming to prevent control tokens from leaking.
 */
function getSafeVisibleText(accumulated: string): string {
  const markerMatch = accumulated.match(/\[(?:DIAGRAMA|SUGERENCIAS|SIMULACI[OÓ]N)\]/i);
  const cutoff = markerMatch?.index !== undefined ? markerMatch.index : accumulated.length;

  let visible = accumulated.slice(0, cutoff);
  const lowerVisible = visible.toLowerCase();
  const candidateTags = [
    '[diagrama]:',
    '[diagrama]',
    '[sugerencias]:',
    '[sugerencias]',
    '[simulacion]:',
    '[simulacion]',
    '[simulación]:',
    '[simulación]',
  ];
  let trimLen = 0;
  for (const tag of candidateTags) {
    for (let len = tag.length; len > trimLen; len--) {
      if (lowerVisible.endsWith(tag.slice(0, len))) {
        trimLen = len;
        break;
      }
    }
  }
  if (trimLen > 0) {
    visible = visible.slice(0, -trimLen);
  }
  return visible;
}

export interface StreamResult {
  text: string;
  diagramPrompt?: string;
  quickChips: string[];
  simulationType?: SimulationType;
  simulationParams?: SimulationParams;
  simulationAdjusted?: SimulationAdjustment[];
}

/**
 * Streams chat responses from Gemini models with per-model timeouts, automatic failover
 * before the first chunk, live filtering of control tokens, and AbortSignal support.
 */
export async function streamNewtonAI(params: {
  prompt: string;
  history?: { role: 'user' | 'model'; parts: { text: string }[] }[];
  imageBase64?: string;
  imageMimeType?: string;
  abortSignal?: AbortSignal;
  onChunk: (chunkText: string) => void;
}): Promise<StreamResult> {
  console.time('[Newton AI Stream] Total Execution');
  const ai = getAI();

  // Model configurations: primary (15s timeout) and fallback (20s timeout)
  const modelConfigs = [
    { model: 'gemini-3.8-flash', timeoutMs: 15000, waitBeforeRetryMs: 500 },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 20000, waitBeforeRetryMs: 1000 },
  ];

  let contents: any[] = [];
  if (params.history && params.history.length > 0) {
    contents = [...params.history];
  }

  const currentParts: any[] = [];
  if (params.imageBase64 && params.imageMimeType) {
    currentParts.push({
      inlineData: {
        mimeType: params.imageMimeType,
        data: params.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    });
  }
  currentParts.push({ text: params.prompt });
  contents.push({ role: 'user', parts: currentParts });

  let rawAccumulated = '';
  let lastEmittedLength = 0;
  let hasEmittedChunk = false;
  let lastError: any = null;

  for (let i = 0; i < modelConfigs.length; i++) {
    const { model, timeoutMs, waitBeforeRetryMs } = modelConfigs[i];
    if (params.abortSignal?.aborted) {
      throw new Error('Petición cancelada por el cliente.');
    }

    const modelTimer = `[Newton AI Stream] ${model}`;
    console.time(modelTimer);

    try {
      // Setup timeout promise
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const tErr = new Error(`Timeout de ${timeoutMs}ms excedido en modelo ${model}`);
          tErr.name = 'TimeoutError';
          reject(tErr);
        }, timeoutMs);
      });

      // Call generateContentStream
      const streamPromise = ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: getNewtonSystemInstruction(),
        },
      });

      const responseStream = await Promise.race([streamPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      // Iterate through chunks
      for await (const chunk of responseStream) {
        if (params.abortSignal?.aborted) {
          console.warn(`[Newton AI Stream] Client disconnected while streaming from ${model}. Aborting.`);
          throw new Error('Petición cancelada por el cliente.');
        }

        const chunkText = chunk.text || '';
        if (chunkText) {
          rawAccumulated += chunkText;

          // Safe chunk streaming (hides [DIAGRAMA] and [SUGERENCIAS] in real-time)
          const safeVisible = getSafeVisibleText(rawAccumulated);
          if (safeVisible.length > lastEmittedLength) {
            const diff = safeVisible.slice(lastEmittedLength);
            lastEmittedLength = safeVisible.length;
            params.onChunk(diff);
            hasEmittedChunk = true;
          }
        }
      }

      console.timeEnd(modelTimer);
      if (rawAccumulated.trim()) {
        break; // Successfully streamed entire response
      }
    } catch (err: any) {
      console.timeEnd(modelTimer);
      lastError = err;

      // If client explicitly aborted, stop immediately
      if (params.abortSignal?.aborted || err?.message?.includes('cancelada por el cliente')) {
        throw new Error('Petición cancelada por el cliente.');
      }

      // Model fallback ONLY allowed before the first chunk is emitted
      const isRetryable = isRetryableModelError(err);
      const httpCode = extractHttpStatus(err);
      console.warn(
        `[Newton AI Stream] Model ${model} failed (HTTP ${httpCode || 'N/A'}, retryable=${isRetryable}, hasEmittedChunk=${hasEmittedChunk}):`,
        err?.message || err
      );

      if (!hasEmittedChunk && isRetryable && i < modelConfigs.length - 1) {
        console.info(`[Newton AI Stream] Waiting ${waitBeforeRetryMs}ms before failing over to next model...`);
        await new Promise((r) => setTimeout(r, waitBeforeRetryMs));
        continue;
      }

      // If already started streaming or error is not retryable, throw
      throw err;
    }
  }

  console.timeEnd('[Newton AI Stream] Total Execution');

  if (!rawAccumulated) {
    throw lastError || new Error('No se pudo obtener respuesta de los modelos de Newton AI.');
  }

  // Parse [SIMULACION] control line first before [DIAGRAMA] and [SUGERENCIAS]
  const simParsed = parseSimulacion(rawAccumulated);
  let cleanText = simParsed.cleanText;

  // Parse diagram prompt from [DIAGRAMA]: description in english
  let diagramPrompt: string | undefined;
  const diagramMatch = cleanText.match(/\[DIAGRAMA\]:\s*([^\n\r]+)/i);
  if (diagramMatch) {
    diagramPrompt = diagramMatch[1].trim();
    cleanText = cleanText.replace(/\[DIAGRAMA\]:\s*[^\n\r]+/i, '').trim();
  }

  // Parse quick chips from [SUGERENCIAS]: chip1 | chip2 | chip3
  let quickChips: string[] = [];
  const chipsMatch = cleanText.match(/\[SUGERENCIAS\]:\s*([^\n\r]+)/i);
  if (chipsMatch) {
    const rawChips = chipsMatch[1];
    quickChips = rawChips.split('|').map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 50);
    cleanText = cleanText.replace(/\[SUGERENCIAS\]:\s*[^\n\r]+/i, '').trim();
  }

  // Detect relevant interactive simulation (marker takes precedence over keyword fallback)
  let simulationType: SimulationType | undefined = simParsed.type;
  if (!simulationType) {
    const lower = (params.prompt + ' ' + cleanText).toLowerCase();
    if (lower.includes('conductor') && (lower.includes('gauss') || lower.includes('equilibrio') || lower.includes('esfera'))) {
      simulationType = 'conductor_gauss';
    } else if (lower.includes('ley de coulomb')) {
      simulationType = 'coulomb';
    } else if (lower.includes('ley de ohm')) {
      simulationType = 'ohm';
    }
  }

  // Default quick chips if none detected
  if (quickChips.length === 0) {
    if (simulationType === 'conductor_gauss') {
      quickChips = ['Explícame el caso r < R', 'Dame un ejemplo numérico', '¿Qué pasa si es un aislante?', 'Graficar campo'];
    } else if (simulationType === 'coulomb') {
      quickChips = ['Duplica la distancia: ¿qué pasa con F?', 'Cambia q2 a negativo', 'Dame un ejercicio de examen'];
    } else if (simulationType === 'ohm') {
      quickChips = ['Duplica la resistencia: ¿qué pasa con I?', 'Calcula la potencia disipada', 'Dame un ejercicio de examen'];
    } else {
      quickChips = ['Dame un ejemplo paso a paso', '¿Qué fórmula se aplica?', 'Ver constantes físicas'];
    }
  }

  const result: StreamResult = {
    text: cleanText,
    diagramPrompt,
    quickChips,
    simulationType,
  };
  if (simParsed.params !== undefined) {
    result.simulationParams = simParsed.params;
  }
  if (simParsed.adjusted.length > 0) {
    result.simulationAdjusted = simParsed.adjusted;
  }
  return result;
}

export async function askNewtonAI(params: {
  prompt: string;
  history?: { role: 'user' | 'model'; parts: { text: string }[] }[];
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<StreamResult> {
  let accumulated = '';
  return streamNewtonAI({
    ...params,
    onChunk: (chunk) => {
      accumulated += chunk;
    },
  });
}

export async function askNewtonVision(params: {
  prompt?: string;
  imageBase64: string;
  imageMimeType?: string;
}): Promise<StreamResult> {
  console.time('[Newton Vision] Total Execution');
  const ai = getAI();
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, '');
  const mimeType = params.imageMimeType || 'image/jpeg';

  const defaultPrompt =
    'Analiza esta imagen escaneada de física aplicada siguiendo el protocolo estricto: 1. Elementos identificados (componentes, valores, nodos), 2. Verificación de legibilidad y advertencias si algo no se lee claro, 3. Resolución y modelado paso a paso con fórmulas en LaTeX.';
  const userPrompt = params.prompt && params.prompt.trim().length > 0 ? params.prompt : defaultPrompt;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        { text: userPrompt },
      ],
    },
  ];

  let rawResponseText = '';
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const modelTimer = `[Newton Vision] generateContent (${model})`;
    console.time(modelTimer);
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: getNewtonVisionInstruction(),
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        VISION_ATTEMPT_TIMEOUT_MS,
        model
      );

      console.timeEnd(modelTimer);
      rawResponseText = response.text || '';
      if (rawResponseText) break;
    } catch (err: any) {
      console.timeEnd(modelTimer);
      lastError = err;
      const retryable = isRetryableModelError(err);
      console.warn(
        `[Newton Vision] Model ${model} failed (retryable=${retryable}):`,
        err?.message || err
      );
      if (retryable && i < modelsToTry.length - 1) {
        continue;
      }
      throw err;
    }
  }

  console.timeEnd('[Newton Vision] Total Execution');

  if (!rawResponseText) {
    throw lastError || new Error('No se pudo procesar la imagen con los modelos de visión de Newton AI.');
  }

  // Parse [SIMULACION] control line first before [DIAGRAMA] and [SUGERENCIAS]
  const simParsed = parseSimulacion(rawResponseText);
  let cleanText = simParsed.cleanText;

  // Parse diagram prompt from [DIAGRAMA]: description in english
  let diagramPrompt: string | undefined;
  const diagramMatch = cleanText.match(/\[DIAGRAMA\]:\s*([^\n\r]+)/i);
  if (diagramMatch) {
    diagramPrompt = diagramMatch[1].trim();
    cleanText = cleanText.replace(/\[DIAGRAMA\]:\s*[^\n\r]+/i, '').trim();
  }

  // Parse quick chips from [SUGERENCIAS]: chip1 | chip2 | chip3
  let quickChips: string[] = [];
  const chipsMatch = cleanText.match(/\[SUGERENCIAS\]:\s*([^\n\r]+)/i);
  if (chipsMatch) {
    const rawChips = chipsMatch[1];
    quickChips = rawChips.split('|').map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 50);
    cleanText = cleanText.replace(/\[SUGERENCIAS\]:\s*[^\n\r]+/i, '').trim();
  }

  let simulationType: SimulationType | undefined = simParsed.type;
  if (!simulationType) {
    const lower = (userPrompt + ' ' + cleanText).toLowerCase();
    if (lower.includes('conductor') && (lower.includes('gauss') || lower.includes('equilibrio') || lower.includes('esfera'))) {
      simulationType = 'conductor_gauss';
    } else if (lower.includes('ley de coulomb')) {
      simulationType = 'coulomb';
    } else if (lower.includes('ley de ohm')) {
      simulationType = 'ohm';
    }
  }

  if (quickChips.length === 0) {
    if (simulationType === 'conductor_gauss') {
      quickChips = ['Explícame el caso r < R', 'Ver simulación interactiva', 'Calcular densidad superficial'];
    } else if (simulationType === 'coulomb') {
      quickChips = ['Duplica la distancia: ¿qué pasa con F?', 'Cambia q2 a negativo', 'Dame un ejercicio de examen'];
    } else if (simulationType === 'ohm') {
      quickChips = ['Duplica la resistencia: ¿qué pasa con I?', 'Calcula la potencia disipada', 'Dame un ejercicio de examen'];
    } else {
      quickChips = ['Calcular con otros valores', 'Explicar las leyes aplicadas', 'Ver constante física'];
    }
  }

  const result: StreamResult = {
    text: cleanText,
    diagramPrompt,
    quickChips,
    simulationType,
  };
  if (simParsed.params !== undefined) {
    result.simulationParams = simParsed.params;
  }
  if (simParsed.adjusted.length > 0) {
    result.simulationAdjusted = simParsed.adjusted;
  }
  return result;
}

export async function transcribeNewtonAudio(params: {
  audioBase64: string;
  mimeType?: string;
}): Promise<{ text: string }> {
  console.time('[Newton Audio] Total Transcription');
  const ai = getAI();
  const cleanBase64 = params.audioBase64.replace(/^data:[^;]+;base64,/, '');
  const mimeType = (params.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: 'Transcribe fielmente en español el contenido de este audio. Si se mencionan leyes de la física (Gauss, Coulomb, Ohm, Kirchhoff, Faraday), fórmulas, símbolos o unidades del Sistema Internacional (ohmios, voltios, microfaradios, amperios, teslas), asegúrate de escribirlos correctamente en español. Devuelve exclusivamente el texto transcrito, sin notas adicionales, sin introducciones ni comillas.',
        },
      ],
    },
  ];

  let transcribedText = '';
  let lastError: any = null;

  for (let i = 0; i < AUDIO_TRANSCRIPTION_MODELS.length; i++) {
    const model = AUDIO_TRANSCRIPTION_MODELS[i];
    const modelTimer = `[Newton Audio] transcribe (${model})`;
    console.time(modelTimer);
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
        }),
        AUDIO_ATTEMPT_TIMEOUT_MS,
        model
      );

      console.timeEnd(modelTimer);
      transcribedText = response.text ? response.text.trim() : '';
      if (transcribedText) break;
    } catch (err: any) {
      console.timeEnd(modelTimer);
      lastError = err;
      console.warn(`[Newton Audio] Model ${model} failed:`, err?.message || err);
      // En audio se prueba SIEMPRE el siguiente modelo (un 400 por formato o modelo no compatible
      // con generateContent no debe cortar la transcripción)
      if (i < AUDIO_TRANSCRIPTION_MODELS.length - 1) {
        continue;
      }
      throw err;
    }
  }

  console.timeEnd('[Newton Audio] Total Transcription');

  if (!transcribedText) {
    throw lastError || new Error('No se pudo transcribir el audio enviado.');
  }

  return { text: transcribedText };
}

export class DiagramApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'DiagramApiError';
    this.statusCode = statusCode;
  }
}

async function translateDiagramPromptToEnglish(prompt: string): Promise<string> {
  const trimmed = prompt.trim();
  if (!looksSpanishPrompt(trimmed)) {
    return trimmed;
  }

  const ai = getAI();
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: trimmed,
        config: {
          systemInstruction:
            'Translate the given physics image/diagram prompt into concise, clear English suitable for image generation. Output ONLY the translated English prompt, with no quotes or extra explanation.',
        },
      });
      const translated = response.text?.trim().replace(/^["']|["']$/g, '');
      if (translated) {
        return translated;
      }
    } catch (err: any) {
      console.warn(`[Newton Diagram] Prompt translation with ${model} failed:`, err?.message || err);
    }
  }

  return trimmed;
}

export async function generateNewtonDiagram(params: {
  prompt: string;
}): Promise<{ imageUrl: string }> {
  console.time('[Newton Diagram] Pollinations URL Generation');
  const cleanPrompt = params.prompt.trim();
  const englishPrompt = await translateDiagramPromptToEnglish(cleanPrompt);
  const imageUrl = buildPollinationsImageUrl(englishPrompt, Math.floor(Math.random() * 1000000));
  console.timeEnd('[Newton Diagram] Pollinations URL Generation');
  return { imageUrl };
}
