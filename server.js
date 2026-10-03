const MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest'
];

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt vazio' });

  let lastError = '';
  for (const MODEL of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });
      const data = await r.json();

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.json({ resposta: data.candidates[0].content.parts[0].text, modelo_usado: MODEL });
      }
      lastError = data.error?.message || 'sem resposta';
      console.log(`Falhou ${MODEL}: ${lastError} - tentando próximo...`);
      // se for erro de chave/limite, nem adianta tentar outros
      if (lastError.includes('API key') || lastError.includes('quota')) break;
    } catch (e) {
      lastError = e.message;
    }
  }
  res.status(503).json({ error: 'Todos os modelos ocupados, tente em 30s. Último erro: ' + lastError });
});
