import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  streamNewtonAI, 
  askNewtonVision, 
  transcribeNewtonAudio, 
  generateNewtonDiagram 
} from './src/server/geminiApi';
import {
  CorsOriginError,
  createApiCorsMiddleware,
  createRequireAuth,
  getRateLimitKey,
} from './src/server/authAndCors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

// Restrict CORS on /api/* to authorized origins (localhost in dev + deployed production domain)
const apiCorsMiddleware = createApiCorsMiddleware();
app.use('/api', apiCorsMiddleware);
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof CorsOriginError || err?.name === 'CorsOriginError') {
    return res.status(403).json({
      error: err.message || 'Origen no autorizado para acceder a esta API.',
    });
  }
  return next(err);
});

app.use(express.json({ limit: '5mb' }));

// Return clean JSON when payload exceeds the 5 MB JSON body limit
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'El archivo o mensaje enviado supera el límite máximo de 5 MB. Intenta con una imagen o audio más ligero.',
    });
  }
  return next(err);
});

// Verify Firebase ID token (Google, email, or anonymous guest) on all /api/* except /api/health
// Runs strictly BEFORE rate limiters and Gemini calls so unauthenticated requests get 401 immediately
const requireAuth = createRequireAuth();
app.use('/api', requireAuth);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 89,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  message: {
    error: 'Has alcanzado el límite de 89 consultas por minuto. Espera unos segundos antes de enviar otro mensaje.',
  },
});

const diagramLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  message: {
    error: 'Has alcanzado el límite de 3 diagramas cada 10 minutos. Espera unos minutos antes de generar otro diagrama.',
  },
});

const MAX_PROMPT_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 6;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

interface ValidatedHistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

function validatePrompt(prompt: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      ok: false,
      error: 'El mensaje (prompt) debe ser un texto no vacío.',
    };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      error: `El mensaje supera el límite máximo de ${MAX_PROMPT_LENGTH.toLocaleString('es-ES')} caracteres.`,
    };
  }
  return { ok: true, value: prompt.trim() };
}

function validateAndTrimHistory(
  history: unknown
): { ok: true; value: ValidatedHistoryMessage[] } | { ok: false; error: string } {
  if (history === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(history)) {
    return {
      ok: false,
      error: 'El historial de conversación debe enviarse como un arreglo válido.',
    };
  }

  const recentSlice = history.slice(-MAX_HISTORY_MESSAGES);
  const sanitized: ValidatedHistoryMessage[] = [];

  for (const item of recentSlice) {
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        error: 'Uno de los elementos del historial de conversación tiene un formato inválido.',
      };
    }
    const role = (item as any).role;
    const parts = (item as any).parts;
    if ((role !== 'user' && role !== 'model') || !Array.isArray(parts) || parts.length === 0) {
      return {
        ok: false,
        error: 'Cada mensaje del historial debe incluir un rol válido y contenido de texto.',
      };
    }

    const textParts: { text: string }[] = [];
    for (const part of parts) {
      if (!part || typeof part !== 'object' || typeof (part as any).text !== 'string') {
        return {
          ok: false,
          error: 'El contenido de los mensajes del historial debe ser texto válido.',
        };
      }
      textParts.push({ text: (part as any).text.slice(0, MAX_PROMPT_LENGTH) });
    }

    sanitized.push({ role, parts: textParts });
  }

  // Ensure history starts with a user turn when non-empty
  while (sanitized.length > 0 && sanitized[0].role !== 'user') {
    sanitized.shift();
  }

  return { ok: true, value: sanitized };
}

function validateImagePayload(
  imageBase64: unknown,
  imageMimeType: unknown,
  required: boolean
):
  | { ok: true; imageBase64?: string; imageMimeType?: string }
  | { ok: false; error: string } {
  if (imageBase64 === undefined || imageBase64 === null || imageBase64 === '') {
    if (required) {
      return { ok: false, error: 'Se requiere una imagen para el análisis visual.' };
    }
    return { ok: true };
  }

  if (typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
    return { ok: false, error: 'La imagen enviada tiene un formato inválido.' };
  }

  let dataUrlMime: string | undefined;
  let rawPayload = imageBase64.trim();

  if (rawPayload.startsWith('data:')) {
    const match = rawPayload.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return {
        ok: false,
        error: 'La imagen codificada en base64 no tiene un encabezado data URL válido.',
      };
    }
    dataUrlMime = match[1].toLowerCase().trim();
    rawPayload = match[2].trim();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(dataUrlMime)) {
      return {
        ok: false,
        error: 'Formato de imagen no permitido. Solo se aceptan imágenes PNG, JPEG o WebP.',
      };
    }
  }

  if (!rawPayload) {
    return { ok: false, error: 'La imagen enviada está vacía.' };
  }

  const providedMime =
    typeof imageMimeType === 'string' && imageMimeType.trim().length > 0
      ? imageMimeType.toLowerCase().trim()
      : undefined;

  const effectiveMime = providedMime || dataUrlMime;
  if (!effectiveMime || !ALLOWED_IMAGE_MIME_TYPES.has(effectiveMime)) {
    return {
      ok: false,
      error: 'Formato de imagen no permitido. Solo se aceptan imágenes PNG, JPEG o WebP.',
    };
  }

  if (providedMime && dataUrlMime && providedMime !== dataUrlMime) {
    return {
      ok: false,
      error: 'El tipo MIME de la imagen no coincide con el formato de la imagen enviada.',
    };
  }

  return {
    ok: true,
    imageBase64: imageBase64.trim(),
    imageMimeType: effectiveMime,
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Newton AI UCSUR' });
});

// SSE Streaming chat endpoint with strict validation & client disconnect cancellation (AbortController)
app.post('/api/chat', chatLimiter, async (req, res) => {
  const reqTimer = `[Server API] POST /api/chat (SSE)_${Date.now()}`;
  console.time(reqTimer);

  const { prompt, history, imageBase64, imageMimeType } = req.body ?? {};

  const promptCheck = validatePrompt(prompt);
  if (!promptCheck.ok) {
    console.timeEnd(reqTimer);
    return res.status(400).json({ error: promptCheck.error });
  }

  const historyCheck = validateAndTrimHistory(history);
  if (!historyCheck.ok) {
    console.timeEnd(reqTimer);
    return res.status(400).json({ error: historyCheck.error });
  }

  const imageCheck = validateImagePayload(imageBase64, imageMimeType, false);
  if (!imageCheck.ok) {
    console.timeEnd(reqTimer);
    return res.status(400).json({ error: imageCheck.error });
  }

  // Setup AbortController and listen for real client disconnect on res
  const abortController = new AbortController();
  let clientDisconnected = false;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      console.log(`[Server API] Desconexión real del cliente en /api/chat antes de finalizar respuesta. Abortando llamada upstream.`);
      abortController.abort();
    }
  });

  try {
    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const finalResult = await streamNewtonAI({
      prompt: promptCheck.value,
      history: historyCheck.value,
      imageBase64: imageCheck.imageBase64,
      imageMimeType: imageCheck.imageMimeType,
      abortSignal: abortController.signal,
      onChunk: (chunkText) => {
        if (!res.writableEnded && !clientDisconnected) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        }
      },
    });

    if (!res.writableEnded && !clientDisconnected) {
      res.write(`data: ${JSON.stringify({ type: 'done', ...finalResult })}\n\n`);
      res.end();
    }
    console.timeEnd(reqTimer);
  } catch (err: any) {
    console.timeEnd(reqTimer);

    // Si la conexión ya está cerrada o la cancelación proviene de desconexión real del cliente, omitir evento de error
    if (clientDisconnected || abortController.signal.aborted || res.destroyed || res.writableEnded) {
      console.log('[Server API] Petición cancelada debido a desconexión del cliente; se omite evento de error.');
      return;
    }

    console.error('Server error /api/chat:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Error processing request' });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message || 'Error en streaming de Newton AI' })}\n\n`);
      res.end();
    }
  }
});

// Non-streaming vision analysis endpoint (strictly validated + AbortController on client disconnect)
app.post('/api/vision', chatLimiter, async (req, res) => {
  const reqTimer = `[Server API] POST /api/vision_${Date.now()}`;
  console.time(reqTimer);

  const { prompt, imageBase64, imageMimeType } = req.body ?? {};

  const promptCheck = validatePrompt(prompt);
  if (!promptCheck.ok) {
    console.timeEnd(reqTimer);
    return res.status(400).json({ error: promptCheck.error });
  }

  const imageCheck = validateImagePayload(imageBase64, imageMimeType, true);
  if (!imageCheck.ok || !imageCheck.imageBase64) {
    console.timeEnd(reqTimer);
    return res.status(400).json({ error: imageCheck.ok ? 'Se requiere una imagen para el análisis visual.' : imageCheck.error });
  }

  const abortController = new AbortController();
  let clientDisconnected = false;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      abortController.abort();
    }
  });

  try {
    const result = await askNewtonVision({
      prompt: promptCheck.value,
      imageBase64: imageCheck.imageBase64,
      imageMimeType: imageCheck.imageMimeType,
      abortSignal: abortController.signal,
    });
    console.timeEnd(reqTimer);
    if (!res.writableEnded && !clientDisconnected) {
      res.json(result);
    }
  } catch (err: any) {
    console.timeEnd(reqTimer);
    if (clientDisconnected || abortController.signal.aborted || res.destroyed || res.writableEnded) {
      return;
    }
    console.error('Server error /api/vision:', err);
    res.status(500).json({ error: err?.message || 'Error processing vision request' });
  }
});

app.post('/api/transcribe', chatLimiter, async (req, res) => {
  const reqTimer = `[Server API] POST /api/transcribe_${Date.now()}`;
  console.time(reqTimer);
  const abortController = new AbortController();
  let clientDisconnected = false;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      abortController.abort();
    }
  });

  try {
    const { audioBase64, mimeType } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      console.timeEnd(reqTimer);
      return res.status(400).json({ error: 'Se requiere audio en base64 para la transcripción.' });
    }
    const result = await transcribeNewtonAudio({
      audioBase64,
      mimeType,
      abortSignal: abortController.signal,
    });
    console.timeEnd(reqTimer);
    if (!res.writableEnded && !clientDisconnected) {
      res.json(result);
    }
  } catch (err: any) {
    console.timeEnd(reqTimer);
    if (clientDisconnected || abortController.signal.aborted || res.destroyed || res.writableEnded) {
      return;
    }
    console.error('Server error /api/transcribe:', err);
    res.status(500).json({ error: err?.message || 'Error processing transcription request' });
  }
});

app.post('/api/diagram', diagramLimiter, async (req, res) => {
  const reqTimer = `[Server API] POST /api/diagram_${Date.now()}`;
  console.time(reqTimer);
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      console.timeEnd(reqTimer);
      return res.status(400).json({ error: 'Se requiere un prompt para generar el diagrama.' });
    }
    const result = await generateNewtonDiagram({ prompt: prompt.trim() });
    console.timeEnd(reqTimer);
    res.json(result);
  } catch (err: any) {
    console.timeEnd(reqTimer);
    const statusCode =
      typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;
    console.error(`Server error /api/diagram (${statusCode}):`, err?.message || err);
    res.status(statusCode).json({ error: err?.message || 'Error al generar el diagrama técnico.' });
  }
});

// In development mode, mount Vite dev middleware
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Serve frontend build if dist folder exists in production
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Newton AI server running on port ${PORT}`);
});
