import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt vazio' });
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Render' });

    let lastError = 'nenhum modelo respondeu';

    for (const MODEL of MODELS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          })
        });
        clearTimeout(timeout);

        const data = await r.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.json({ resposta: text, modelo_usado: MODEL });
        }

        lastError = data.error?.message || 'sem resposta';
        console.log(`Falhou ${MODEL}: ${lastError}`);
        if (lastError.includes('API key') || lastError.toLowerCase().includes('quota')) break;

      } catch (e) {
        clearTimeout(timeout);
        lastError = e.name === 'AbortError'? 'timeout 12s' : e.message;
        console.log(`Pulou ${MODEL}: ${lastError}`);
      }
    }

    res.status(503).json({ error: 'Todos ocupados, tente em 30s. Último: ' + lastError });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('rodando na porta ' + PORT));
