import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your Secrets configuration.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/translate', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        text?: unknown;
        targetLanguage?: unknown;
        context?: unknown;
      };

      const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
      const targetLanguage =
        typeof body?.targetLanguage === 'string'
          ? body.targetLanguage.trim()
          : '';
      const context =
        typeof body?.context === 'string' ? body.context.trim().slice(0, 120) : '';

      if (!rawText || rawText.length > 2500) {
        res.status(400).json({
          error: 'Le texte à traduire doit contenir entre 1 et 2500 caractères.',
        });
        return;
      }

      if (!targetLanguage || targetLanguage.length > 60) {
        res.status(400).json({
          error: 'Veuillez spécifier une langue cible valide.',
        });
        return;
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Translate the following ${
          context ? `${context} ` : ''
        }text accurately into "${targetLanguage}". Preserve numbers, currency symbols, phone/WhatsApp numbers, and proper nouns intact.\n\nText:\n${rawText}`,
        config: {
          systemInstruction:
            'You are a precise multilingual translator for a global peer-to-peer second-hand marketplace called Dilservice. Always return valid JSON with detectedLanguage (human-readable name of the original language) and translatedText (the natural translation in the requested targetLanguage). Do not add commentary or explanations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: {
                type: Type.STRING,
                description: 'Detected source language name.',
              },
              translatedText: {
                type: Type.STRING,
                description: 'Translated text in the requested target language.',
              },
            },
            required: ['detectedLanguage', 'translatedText'],
          },
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        detectedLanguage?: string;
        translatedText?: string;
      };

      if (!parsed.translatedText) {
        res.status(502).json({
          error: 'La traduction a renvoyé une réponse vide.',
        });
        return;
      }

      res.json({
        detectedLanguage: parsed.detectedLanguage || 'Auto',
        translatedText: parsed.translatedText,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la traduction.';
      res.status(500).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dilservice server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Dilservice server:', err);
  process.exit(1);
});
