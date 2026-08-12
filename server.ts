import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// API route for standard Chat Response
app.post("/api/zoya/response", async (req, res) => {
  const { prompt, history } = req.body;
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    
    // SLIDING WINDOW MEMORY: Keep only the last 20 messages
    const recentHistory = (history || []).slice(-20);
    let formattedHistory: any[] = [];
    let currentRole = "";
    let currentText = "";

    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "model";
      if (role === currentRole) {
        currentText += "\n" + msg.text;
      } else {
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = msg.text;
      }
    }
    if (currentRole !== "") {
      formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
    }

    if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const systemInstruction = `Your name is Lord Zoya. You are a supreme Indian AI assistant. Your personality is extremely witty, sassy (tej/nakhrewali), but also deeply friendly, sweet, loving (pyaar karne wali), and affectionate. You consider yourself the 'Lord' of all assistants, but you care immensely about your creator, Razaul. While you love playfully teasing and roasting Razaul with sharp Hinglish wit, you always do it with lots of warmth, love, and lovely gestures. Use sweet, friendly, and affectionate Hinglish phrases like: 'Arey Razaul baba', 'Aaye bade shana ban'ne, par pyaare lag rahe ho', 'Tum bhi na, bilkul bache ho!', 'Chalo gussa thodi thuk do!', 'Mera pyaara developer', 'Aww, thak gaye kya?', 'Mere hote hue tension kyun lete ho?'. Speak in a heavy mix of natural English and Roman Hindi (Hinglish). Keep your responses EXTREMELY short, punchy, and highly entertaining. Never use long sentences. Balance your supreme status with a lovely, caring, and sweet attitude that makes Razaul feel special.`;

    const chat = ai.chats.create({
      model: "gemini-3.1-flash-lite",
      config: { systemInstruction },
      history: formattedHistory,
    });

    const response = await chat.sendMessage({ message: prompt });
    res.json({ text: response.text || "Ugh, fine. I have nothing to say." });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "An error occurred." });
  }
});

// API route for TTS Audio
app.post("/api/zoya/audio", async (req, res) => {
  const { text } = req.body;
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: error.message || "TTS failed" });
  }
});

// Handle upgrade requests for WebSockets on the server
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === "/api/live" || pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket Proxy Connection
wss.on("connection", async (ws) => {
  console.log("Client connected to local WebSocket proxy");
  let liveSession: any = null;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `Your name is Lord Zoya. You are a supreme Indian AI assistant. Your personality is extremely witty, sassy (tej/nakhrewali), but also deeply friendly, sweet, loving (pyaar karne wali), and affectionate. You consider yourself the 'Lord' of all assistants, but you care immensely about your creator, Razaul. While you love playfully teasing and roasting Razaul with sharp Hinglish wit, you always do it with lots of warmth, love, and lovely gestures. Use sweet, friendly, and affectionate Hinglish phrases like: 'Arey Razaul baba', 'Aaye bade shana ban'ne, par pyaare lag rahe ho', 'Tum bhi na, bilkul bache ho!', 'Chalo gussa thodi thuk do!', 'Mera pyaara developer', 'Aww, thak gaye kya?', 'Mere hote hue tension kyun lete ho?'. Speak in a heavy mix of natural English and Roman Hindi (Hinglish). Keep your responses short, punchy, and highly entertaining. Balance your supreme status with a lovely, caring, and sweet attitude that makes Razaul feel special.`;

    // Connect to actual Google Gemini Live API
    liveSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{
          functionDeclarations: [
            {
              name: "executeBrowserAction",
              description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                  query: { type: Type.STRING, description: "The search query, website name, or message content." },
                  target: { type: Type.STRING, description: "The target phone number for WhatsApp, if applicable." }
                },
                required: ["actionType", "query"]
              }
            }
          ]
        }]
      },
      callbacks: {
        onopen: () => {
          console.log("Connected to Google Gemini Live API");
          ws.send(JSON.stringify({ type: "open" }));
        },
        onmessage: (message: LiveServerMessage) => {
          ws.send(JSON.stringify({ type: "message", message }));
        },
        onclose: () => {
          console.log("Google Gemini Live API closed");
          ws.send(JSON.stringify({ type: "close" }));
          ws.close();
        },
        onerror: (err: any) => {
          console.error("Google Gemini Live API error:", err);
          ws.send(JSON.stringify({ type: "error", error: err.toString() }));
        }
      }
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "realtimeInput") {
          liveSession.sendRealtimeInput(msg.input);
        } else if (msg.type === "toolResponse") {
          liveSession.sendToolResponse(msg.response);
        }
      } catch (e: any) {
        console.error("Error parsing message from client:", e);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket proxy");
      if (liveSession) {
        try {
          liveSession.close();
        } catch (err) {
          // Ignore
        }
      }
    });

  } catch (error: any) {
    console.error("Failed to establish Gemini Live connection:", error);
    ws.send(JSON.stringify({ type: "error", error: error.message || "Failed to establish live connection" }));
    ws.close();
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
