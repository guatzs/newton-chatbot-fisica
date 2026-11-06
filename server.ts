import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { askNewtonAI, askNewtonVision, transcribeNewtonAudio, generateNewtonDiagram } from './src/server/geminiApi';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Newton AI UCSUR' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history, imageBase64, imageMimeType } = req.body;
    const result = await askNewtonAI({
      prompt: prompt || '',
      history: history || [],
      imageBase64,
      imageMimeType,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Server error /api/chat:', err);
    res.status(500).json({ error: err?.message || 'Error processing request' });
  }
});

app.post('/api/vision', async (req, res) => {
  try {
    const { prompt, imageBase64, imageMimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere una imagen para el análisis visual.' });
    }
    const result = await askNewtonVision({
      prompt,
      imageBase64,
      imageMimeType,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Server error /api/vision:', err);
    res.status(500).json({ error: err?.message || 'Error processing vision request' });
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Se requiere audio en base64 para la transcripción.' });
    }
    const result = await transcribeNewtonAudio({ audioBase64, mimeType });
    res.json(result);
  } catch (err: any) {
    console.error('Server error /api/transcribe:', err);
    res.status(500).json({ error: err?.message || 'Error processing transcription request' });
  }
});

app.post('/api/diagram', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Se requiere un prompt para generar el diagrama.' });
    }
    const result = await generateNewtonDiagram({ prompt: prompt.trim() });
    res.json(result);
  } catch (err: any) {
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
