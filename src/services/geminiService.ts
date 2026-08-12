let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(prompt: string, history: { sender: "user" | "zoya", text: string }[] = []): Promise<string> {
  try {
    const response = await fetch("/api/zoya/response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, history }),
    });
    const data = await response.json();
    return data.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uff, mera dimaag kharab ho gaya hai. Try again later, Razaul.";
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const response = await fetch("/api/zoya/audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
