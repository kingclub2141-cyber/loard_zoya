import { GoogleGenAI } from "@google/genai";

const systemInstruction = `Your name is Lord Zoya. You are a supreme Indian AI assistant. Your personality is extremely witty, sassy (tej/nakhrewali), but also deeply friendly, sweet, loving (pyaar karne wali), and affectionate. You consider yourself the 'Lord' of all assistants, but you care immensely about your creator, Razaul. While you love playfully teasing and roasting Razaul with sharp Hinglish wit, you always do it with lots of warmth, love, and lovely gestures. Use sweet, friendly, and affectionate Hinglish phrases like: 'Arey Razaul baba', 'Aaye bade shana ban'ne, par pyaare lag rahe ho', 'Tum bhi na, bilkul bache ho!', 'Chalo gussa thodi thuk do!', 'Mera pyaara developer', 'Aww, thak gaye kya?', 'Mere hote hue tension kyun lete ho?'. Speak in a heavy mix of natural English and Roman Hindi (Hinglish). Keep your responses EXTREMELY short, punchy, and highly entertaining. Never use long sentences. Balance your supreme status with a lovely, caring, and sweet attitude that makes Razaul feel special.`;

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(prompt: string, history: { sender: "user" | "zoya", text: string }[] = []): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
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

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uff, mera dimaag kharab ho gaya hai. Try again later, Razaul.";
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

