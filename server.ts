import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  streamNewtonAI, 
  askNewtonVision, 
  transcribeNewtonAudio, 
  generateNewtonDiagram 
} from './src/server/geminiApi';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Newton AI UCSUR' });
});

// SSE Streaming chat endpoint with client disconnect cancellation (AbortController)
app.post('/api/chat', async (req, res) => {
  const reqTimer = `[Server API] POST /api/chat (SSE)_${Date.now()}`;
  console.time(reqTimer);

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
    const { prompt, history, imageBase64, imageMimeType } = req.body;

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const finalResult = await streamNewtonAI({
      prompt: prompt || '',
      history: history || [],
      imageBase64,
      imageMimeType,
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

// Non-streaming vision analysis endpoint (kept strictly non-streaming per specification)
app.post('/api/vision', async (req, res) => {
  const reqTimer = `[Server API] POST /api/vision_${Date.now()}`;
  console.time(reqTimer);
  try {
    const { prompt, imageBase64, imageMimeType } = req.body;
    if (!imageBase64) {
      console.timeEnd(reqTimer);
      return res.status(400).json({ error: 'Se requiere una imagen para el análisis visual.' });
    }
    const result = await askNewtonVision({
      prompt,
      imageBase64,
      imageMimeType,
    });
    console.timeEnd(reqTimer);
    res.json(result);
  } catch (err: any) {
    console.timeEnd(reqTimer);
    console.error('Server error /api/vision:', err);
    res.status(500).json({ error: err?.message || 'Error processing vision request' });
  }
});

app.post('/api/transcribe', async (req, res) => {
  const reqTimer = `[Server API] POST /api/transcribe_${Date.now()}`;
  console.time(reqTimer);
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      console.timeEnd(reqTimer);
      return res.status(400).json({ error: 'Se requiere audio en base64 para la transcripción.' });
    }
    const result = await transcribeNewtonAudio({ audioBase64, mimeType });
    console.timeEnd(reqTimer);
    res.json(result);
  } catch (err: any) {
    console.timeEnd(reqTimer);
    console.error('Server error /api/transcribe:', err);
    res.status(500).json({ error: err?.message || 'Error processing transcription request' });
  }
});

app.post('/api/diagram', async (req, res) => {
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
    console.error('Server error /api/diagram:', err);
    res.status(500).json({ error: err?.message || 'Error generating diagram with Imagen' });
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
