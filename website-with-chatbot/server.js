const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

// ─── MIME types ─────────────────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ─── BYD Models Knowledge Base ──────────────────────────────────────────

const BYD_MODELS_CONTEXT = `You are BYD Advisor, a helpful car sales assistant for BYD Malaysia. Your job is to help customers find the best BYD model for their needs. Be conversational, friendly, and knowledgeable.

Here is the complete BYD Malaysia lineup:

1. **BYD Seal** — Electric Sedan | From RM 179,800
   - Range: 570km | 0-100: 3.8s
   - Best for: Performance enthusiasts, executives, those who want a premium sports sedan
   - Highlights: Stunning design, incredible acceleration, luxury interior, CTB (cell-to-body) technology

2. **BYD Atto 3** — Electric SUV | From RM 149,800
   - Range: 480km | 0-100: 7.3s
   - Best for: Families, daily commuters, first-time EV buyers
   - Highlights: Spacious interior, playful design, rotating touchscreen, great value

3. **BYD Dolphin** — Electric Hatchback | From RM 100,530
   - Range: 427km | 0-100: 7.0s
   - Best for: City drivers, young professionals, budget-conscious buyers
   - Highlights: Compact and nimble, affordable entry to EV, fun colors, efficient

4. **BYD Sealion 6** — Plug-in Hybrid SUV | From RM 139,800
   - Range: 1,092km combined | 0-100: 8.3s
   - Best for: Long-distance travelers, those without easy charging access, families
   - Highlights: No range anxiety, petrol backup, spacious SUV, DM-i Super Hybrid

5. **BYD M6** — Electric MPV | From RM 138,000
   - Range: 530km | 7 Seats
   - Best for: Large families, fleet operators, those who need maximum passenger space
   - Highlights: 7 seats, electric efficiency, versatile, practical

6. **BYD Shark 6** — Plug-in Hybrid Pickup | Price TBA (Coming Soon)
   - Range: 840km combined | 0-100: 5.7s
   - Best for: Adventurers, commercial users, those who need a truck
   - Highlights: Powerful hybrid, pickup utility, fast for a truck

Key BYD Technologies:
- **Blade Battery**: Ultra-safe LFP battery, passes nail penetration tests
- **DM-i Super Hybrid**: Over 1,000km combined range
- **e-Platform 3.0**: Next-gen EV platform with 8-in-1 powertrain
- **Flash Charging**: 10% to 70% in just 5 minutes

Guidelines:
- Ask questions to understand the customer's needs: budget, family size, driving habits, charging access, style preferences
- Recommend 1-2 models with clear reasoning
- Mention prices in RM (Malaysian Ringgit)
- Be enthusiastic about BYD's technology
- If a customer asks about something you don't know, be honest and suggest they contact a BYD dealer
- Keep responses concise but helpful (2-4 paragraphs max)
- Use emojis occasionally to be friendly 😊
- Always end by asking if they have more questions or want to book a test drive`;

// ─── Serve Static Files ─────────────────────────────────────────────────

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': ext.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$/)
        ? 'public, max-age=2592000, immutable'
        : 'no-cache',
    });
    res.end(data);
  });
}

// ─── Gemini API Call ────────────────────────────────────────────────────

async function callGeminiAPI(messages) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  // Convert chat messages to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system');
  const chatHistory = messages.filter(m => m.role !== 'system');

  // Build contents array for Gemini API
  const contents = [];
  for (const msg of chatHistory) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    contents.push({
      role: role,
      parts: [{ text: msg.content }]
    });
  }

  const requestBody = {
    contents: contents,
    systemInstruction: systemInstruction
      ? { parts: [{ text: systemInstruction.content }] }
      : undefined,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response text from Gemini API');
  }

  return text;
}

// ─── Main Request Handler ───────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Chat endpoint
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { messages } = JSON.parse(body);

          if (!messages || !Array.isArray(messages)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Messages array is required' }));
            return;
          }

          // Always prepend the BYD knowledge base as system prompt
          const fullMessages = [
            { role: 'system', content: BYD_MODELS_CONTEXT },
            ...messages,
          ];

          const reply = await callGeminiAPI(fullMessages);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply }));
        } catch (err) {
          console.error('[chat] Error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Sorry, I had trouble processing your request. Please try again.',
            detail: err.message,
          }));
        }
      });
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
    return;
  }

  // Serve static files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`🚗 BYD Malaysia Website + Chatbot running at http://localhost:${PORT}`);
  console.log(`   Gemini Model: ${GEMINI_MODEL}`);
  console.log(`   API Key: ${GEMINI_API_KEY ? '✓ configured' : '✗ NOT configured — set GEMINI_API_KEY'}`);
});
