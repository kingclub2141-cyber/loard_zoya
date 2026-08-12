import { processCommand } from "./commandService";

export class LiveSessionManager {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};

  constructor() {
    // No direct @google/genai client initialization in browser
  }

  async start() {
    try {
      this.onStateChange("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;

      // Get Microphone
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
      } catch (micError: any) {
        console.error("Microphone access denied:", micError);
        throw new Error("MICROPHONE_PERMISSION_DENIED");
      }

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Connect to server WebSocket proxy
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      this.ws = new WebSocket(wsUrl);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.ws.send(JSON.stringify({
          type: "realtimeInput",
          input: {
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          }
        }));
      };

      return new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error("WebSocket failed to initialize"));

        this.ws.onopen = () => {
          console.log("WebSocket connection to proxy opened");
          this.onStateChange("listening");
          resolve();
        };

        this.ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "open") {
              console.log("Proxy reported live connection is active");
              this.onStateChange("listening");
            } else if (data.type === "message") {
              const message = data.message;
              
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                this.onStateChange("speaking");
                this.playAudioChunk(base64Audio);
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                this.stopPlayback();
                this.onStateChange("listening");
              }

              // Handle Transcriptions
              const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (userText) {
                 // Output transcription
                 this.onMessage("zoya", userText);
              }

              // Handle Function Calls
              const functionCalls = message.toolCall?.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                  if (call.name === "executeBrowserAction") {
                    const args = call.args as any;
                    let url = "";
                    if (args.actionType === "youtube") {
                      url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                    } else if (args.actionType === "spotify") {
                      url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                    } else if (args.actionType === "whatsapp") {
                      url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                    } else {
                      let website = args.query.replace(/\s+/g, "");
                      if (!website.includes(".")) website += ".com";
                      url = `https://www.${website}`;
                    }
                    
                    this.onCommand(url);
                    
                    // Send tool response to proxy
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                      this.ws.send(JSON.stringify({
                        type: "toolResponse",
                        response: {
                          functionResponses: [{
                            name: call.name,
                            id: call.id,
                            response: { result: "Action executed successfully in the browser." }
                          }]
                        }
                      }));
                    }
                  }
                }
              }
            } else if (data.type === "close") {
              console.log("Proxy reported live connection was closed");
              this.stop();
            } else if (data.type === "error") {
              console.error("Proxy reported live connection error:", data.error);
              if (data.error.includes("Permission") || data.error.includes("403")) {
                this.onMessage("zoya", "Lord Zoya commands you to check your API session. Permission was denied by the heavens.");
              }
              this.stop();
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket connection to proxy closed");
          this.stop();
        };

        this.ws.onerror = (err) => {
          console.error("WebSocket connection error:", err);
          reject(new Error("LIVE_API_CONNECTION_FAILED"));
        };
      });

    } catch (error: any) {
      console.error("General failure starting Live Session:", error);
      this.stop();
      throw error;
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close().catch(() => {});
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {}
      this.ws = null;
    }
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "realtimeInput",
        input: { text }
      }));
    }
  }
}
