import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Send, 
  Trash2, 
  Sparkles, 
  Flame, 
  Cpu, 
  History, 
  User, 
  Heart,
  Activity, 
  Radio,
  Settings,
  MessageSquareShare,
  Sliders,
  X
} from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // High-fidelity active profile configuration settings
  type NeonTheme = "amber" | "cyber" | "crimson" | "gold" | "emerald";

  const [neonTheme, setNeonTheme] = useState<NeonTheme>(() => {
    const saved = localStorage.getItem("zoya_neon_theme");
    return (saved as NeonTheme) || "amber";
  });

  useEffect(() => {
    localStorage.setItem("zoya_neon_theme", neonTheme);
  }, [neonTheme]);

  const [personalityMode, setPersonalityMode] = useState<"lovely" | "classic">("lovely");
  const [voiceVolume, setVoiceVolume] = useState<number>(90);
  const [speechSpeed, setSpeechSpeed] = useState<string>("Normal");

  // Holographic panel toggle state for mobile
  const [activeMobileTab, setActiveMobileTab] = useState<"visualizer" | "history" | "stats">("visualizer");

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        // Automatically unmute when starting a conversational voice session so you can hear Zoya's voice
        setIsMuted(false);
        session.isMuted = false;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e: any) {
        console.error("Failed to start session", e);
        if (e.message === "MICROPHONE_PERMISSION_DENIED") {
          setShowPermissionModal(true);
        } else {
          setMessages((prev) => [...prev, { 
            id: Date.now().toString() + "-error", 
            sender: "zoya", 
            text: "Failed to connect to the Live Session. Please try refreshing or checking your network." 
          }]);
        }
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  // Professional, organic conversational cues
  const conversationStarters = [
    { label: "💖 Sweet Message", text: "Say something sweet, lovely, and friendly to me" },
    { label: "🌶️ Playful Tease", text: "Tease or roast me playfully in Hinglish!" },
    { label: "🎮 Chat with Razaul", text: "Mera pyaara developer bolke thoda pyaare se danto mujhe!" },
    { label: "🎵 Chill Lofi", text: "Open YouTube with search query cozy lofi rain music" }
  ];

  // Neon theme overrides reflecting current runtime state
  const getThemeColors = () => {
    // Dynamically maps state color palettes according to the selected Neon Theme
    switch (neonTheme) {
      case "cyber":
        switch (appState) {
          case "listening":
            return {
              glow: "border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.12)]",
              badge: "bg-blue-500/5 border-blue-500/20 text-blue-300",
              accentClass: "text-blue-400",
              barColor: "bg-blue-500"
            };
          case "processing":
            return {
              glow: "border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)]",
              badge: "bg-cyan-500/5 border-cyan-500/20 text-cyan-300",
              accentClass: "text-cyan-400",
              barColor: "bg-cyan-400"
            };
          case "speaking":
            return {
              glow: "border-fuchsia-500/30 shadow-[0_0_25px_rgba(217,70,239,0.12)]",
              badge: "bg-fuchsia-500/5 border-fuchsia-500/20 text-fuchsia-300",
              accentClass: "text-fuchsia-400",
              barColor: "bg-fuchsia-500"
            };
          default:
            return {
              glow: "border-neutral-800 shadow-[0_0_15px_rgba(59,130,246,0.03)]",
              badge: "bg-neutral-900 border-neutral-800 text-neutral-400",
              accentClass: "text-blue-500",
              barColor: "bg-blue-600"
            };
        }
      case "crimson":
        switch (appState) {
          case "listening":
            return {
              glow: "border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.12)]",
              badge: "bg-red-500/5 border-red-500/20 text-red-300",
              accentClass: "text-red-400",
              barColor: "bg-red-500"
            };
          case "processing":
            return {
              glow: "border-orange-500/30 shadow-[0_0_25px_rgba(249,115,22,0.12)]",
              badge: "bg-orange-500/5 border-orange-500/20 text-orange-300",
              accentClass: "text-orange-400",
              barColor: "bg-orange-500"
            };
          case "speaking":
            return {
              glow: "border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.12)]",
              badge: "bg-purple-500/5 border-purple-500/20 text-purple-300",
              accentClass: "text-purple-400",
              barColor: "bg-purple-500"
            };
          default:
            return {
              glow: "border-neutral-800 shadow-[0_0_15px_rgba(239,68,68,0.03)]",
              badge: "bg-neutral-900 border-neutral-800 text-neutral-400",
              accentClass: "text-red-500",
              barColor: "bg-red-600"
            };
        }
      case "gold":
        switch (appState) {
          case "listening":
            return {
              glow: "border-yellow-500/30 shadow-[0_0_25px_rgba(234,179,8,0.12)]",
              badge: "bg-yellow-500/5 border-yellow-500/20 text-yellow-300",
              accentClass: "text-yellow-400",
              barColor: "bg-yellow-500"
            };
          case "processing":
            return {
              glow: "border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.12)]",
              badge: "bg-amber-500/5 border-amber-500/20 text-amber-300",
              accentClass: "text-amber-400",
              barColor: "bg-amber-500"
            };
          case "speaking":
            return {
              glow: "border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.12)]",
              badge: "bg-rose-500/5 border-rose-500/20 text-rose-300",
              accentClass: "text-rose-400",
              barColor: "bg-rose-500"
            };
          default:
            return {
              glow: "border-neutral-800 shadow-[0_0_15px_rgba(234,179,8,0.03)]",
              badge: "bg-neutral-900 border-neutral-800 text-neutral-400",
              accentClass: "text-yellow-500",
              barColor: "bg-yellow-600"
            };
        }
      case "emerald":
        switch (appState) {
          case "listening":
            return {
              glow: "border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.12)]",
              badge: "bg-emerald-500/5 border-emerald-500/20 text-emerald-300",
              accentClass: "text-emerald-400",
              barColor: "bg-emerald-500"
            };
          case "processing":
            return {
              glow: "border-teal-500/30 shadow-[0_0_25px_rgba(20,184,166,0.12)]",
              badge: "bg-teal-500/5 border-teal-500/20 text-teal-300",
              accentClass: "text-teal-400",
              barColor: "bg-teal-400"
            };
          case "speaking":
            return {
              glow: "border-lime-500/30 shadow-[0_0_25px_rgba(132,204,22,0.12)]",
              badge: "bg-lime-500/5 border-lime-500/20 text-lime-300",
              accentClass: "text-lime-400",
              barColor: "bg-lime-500"
            };
          default:
            return {
              glow: "border-neutral-800 shadow-[0_0_15px_rgba(16,185,129,0.03)]",
              badge: "bg-neutral-900 border-neutral-800 text-neutral-400",
              accentClass: "text-emerald-500",
              barColor: "bg-emerald-600"
            };
        }
      case "amber":
      default:
        switch (appState) {
          case "listening":
            return {
              glow: "border-violet-500/30 shadow-[0_0_25px_rgba(139,92,246,0.12)]",
              badge: "bg-violet-500/5 border-violet-500/20 text-violet-300",
              accentClass: "text-violet-400",
              barColor: "bg-violet-500"
            };
          case "processing":
            return {
              glow: "border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.12)]",
              badge: "bg-amber-500/5 border-amber-500/20 text-amber-300",
              accentClass: "text-amber-400",
              barColor: "bg-amber-500"
            };
          case "speaking":
            return {
              glow: "border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.12)]",
              badge: "bg-rose-500/5 border-rose-500/20 text-rose-300",
              accentClass: "text-rose-400",
              barColor: "bg-rose-500"
            };
          default:
            return {
              glow: "border-neutral-800 shadow-[0_0_15px_rgba(251,191,36,0.03)]",
              badge: "bg-neutral-900 border-neutral-800 text-neutral-400",
              accentClass: "text-amber-500",
              barColor: "bg-amber-600"
            };
        }
    }
  };

  const getBackdropGlows = () => {
    switch (neonTheme) {
      case "cyber":
        return {
          glow1: "from-blue-950/25",
          glow2: "from-cyan-950/20",
          glow3: "bg-indigo-950/10"
        };
      case "crimson":
        return {
          glow1: "from-red-950/25",
          glow2: "from-rose-950/20",
          glow3: "bg-purple-950/10"
        };
      case "gold":
        return {
          glow1: "from-yellow-950/30",
          glow2: "from-amber-950/20",
          glow3: "bg-orange-950/10"
        };
      case "emerald":
        return {
          glow1: "from-emerald-950/25",
          glow2: "from-teal-950/20",
          glow3: "bg-green-950/10"
        };
      case "amber":
      default:
        return {
          glow1: "from-amber-950/20",
          glow2: "from-violet-950/20",
          glow3: "bg-rose-950/10"
        };
    }
  };

  const getHeaderStyle = () => {
    switch (neonTheme) {
      case "cyber":
        return {
          headerGlow: "from-blue-500 to-cyan-500",
          sparklesColor: "text-cyan-400",
          activeBadge: "bg-blue-500/10 text-blue-300 border border-blue-500/25"
        };
      case "crimson":
        return {
          headerGlow: "from-red-500 to-rose-500",
          sparklesColor: "text-rose-450",
          activeBadge: "bg-red-500/10 text-red-300 border border-red-500/25"
        };
      case "gold":
        return {
          headerGlow: "from-yellow-400 to-amber-500",
          sparklesColor: "text-amber-400",
          activeBadge: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/25"
        };
      case "emerald":
        return {
          headerGlow: "from-emerald-500 to-teal-500",
          sparklesColor: "text-emerald-400",
          activeBadge: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
        };
      case "amber":
      default:
        return {
          headerGlow: "from-amber-500 to-rose-500",
          sparklesColor: "text-amber-400",
          activeBadge: "bg-amber-500/10 text-amber-300 border border-amber-500/25"
        };
    }
  };

  const backdropGlow = getBackdropGlows();
  const headerStyle = getHeaderStyle();
  const currentTheme = getThemeColors();

  return (
    <div className="h-[100dvh] w-screen bg-[#080808] text-neutral-200 flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0 selection:bg-amber-500/10">
      
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {/* Deep Space Studio Lighting Backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-[15%] -left-[10%] w-[55vw] h-[55vh] bg-gradient-to-br ${backdropGlow.glow1} to-transparent blur-[120px] rounded-full`} />
        <div className={`absolute -bottom-[15%] -right-[10%] w-[55vw] h-[55vh] bg-gradient-to-tl ${backdropGlow.glow2} to-transparent blur-[120px] rounded-full`} />
        <div className={`absolute top-[35%] left-[20%] w-[45vw] h-[45vh] ${backdropGlow.glow3} blur-[130px] rounded-full`} />
      </div>

      {/* HEADER SECTION */}
      <header className="w-full flex justify-between items-center z-50 shrink-0 px-6 py-4 md:px-10 md:py-6 bg-[#090909]/80 border-b border-neutral-900 backdrop-blur-md">
        
        {/* Brand identity - Minimalist, elite & professional */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r ${headerStyle.headerGlow} rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500`} />
            <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 relative z-10">
              <Sparkles className={`w-4 h-4 ${headerStyle.sparklesColor}`} />
            </div>
          </div>
          
          <div className="flex flex-col font-sans">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-widest text-white uppercase font-sans">
                Zoya
              </span>
              <span className={`text-[8px] font-semibold font-mono px-1.5 py-0.5 rounded ${headerStyle.activeBadge}`}>
                ACTIVE
              </span>
            </div>
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
              Conversational Voice Intelligent
            </span>
          </div>
        </div>

        {/* Real-Time Session Status Info */}
        <div className="hidden md:flex items-center gap-6 px-5 py-2 rounded-full bg-neutral-900/50 border border-neutral-800/80">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${appState !== "idle" ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Session Status: {appState === "idle" ? "Idle" : appState.toUpperCase()}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-neutral-800" />
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Core: Gemini Live
            </span>
          </div>
        </div>

        {/* Header Action buttons */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Would you like to clear the conversation log?")) {
                  setMessages([]);
                  resetZoyaSession();
                }
              }}
              className="p-2 rounded-lg bg-neutral-900/60 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition border border-neutral-800"
              title="Clear Session History"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-neutral-900/60 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition border border-neutral-800"
            title={isMuted ? "Unmute Voice" : "Mute Voice Output"}
          >
            {isMuted ? (
              <VolumeX size={16} className="text-rose-400" />
            ) : (
              <Volume2 size={16} className="text-amber-400" />
            )}
          </button>
        </div>
      </header>

      {/* MOBILE TAB NAVIGATOR */}
      <div className="flex md:hidden w-full px-4 pt-3 gap-2 z-50 shrink-0">
        <button
          onClick={() => setActiveMobileTab("visualizer")}
          className={`flex-1 py-2 text-[10px] font-mono tracking-wider uppercase rounded-lg border transition ${
            activeMobileTab === "visualizer"
              ? "bg-neutral-900 border-amber-500/30 text-amber-300"
              : "bg-[#0b0b0b] border-neutral-900 text-neutral-500"
          }`}
        >
          Visualizer
        </button>
        <button
          onClick={() => setActiveMobileTab("history")}
          className={`flex-1 py-2 text-[10px] font-mono tracking-wider uppercase rounded-lg border transition ${
            activeMobileTab === "history"
              ? "bg-neutral-900 border-violet-500/30 text-violet-300"
              : "bg-[#0b0b0b] border-neutral-900 text-neutral-500"
          }`}
        >
          Session Logs ({messages.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("stats")}
          className={`flex-1 py-2 text-[10px] font-mono tracking-wider uppercase rounded-lg border transition ${
            activeMobileTab === "stats"
              ? "bg-neutral-900 border-rose-500/30 text-rose-300"
              : "bg-[#0b0b0b] border-neutral-900 text-neutral-500"
          }`}
        >
          Assistant Profile
        </button>
      </div>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 w-full flex flex-row items-stretch justify-between overflow-hidden z-10 px-4 md:px-8 py-4 gap-6 relative">
        
        {/* PANEL A (LEFT): Assistant Profile & Settings (Interactive parameters) */}
        <div className={`w-full md:w-[28%] xl:w-[22dvw] flex flex-col justify-between gap-4 h-full z-10 ${
          activeMobileTab === "stats" ? "flex" : "hidden md:flex"
        }`}>
          {/* Real Settings and Parameters */}
          <div className="bg-[#0b0b0b]/60 border border-neutral-900 rounded-2xl p-5 flex flex-col gap-5 shadow-xl hover:border-neutral-800 transition">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-900">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Voice & Output Profile</span>
            </div>

            {/* Personality Preset Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Personality Accent</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-900">
                <button
                  onClick={() => setPersonalityMode("lovely")}
                  className={`py-2 text-[10px] font-mono uppercase tracking-wide rounded-lg transition ${
                    personalityMode === "lovely" 
                      ? "bg-neutral-900 text-amber-300 font-bold border border-neutral-800" 
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Lovely & Caring
                </button>
                <button
                  onClick={() => setPersonalityMode("classic")}
                  className={`py-2 text-[10px] font-mono uppercase tracking-wide rounded-lg transition ${
                    personalityMode === "classic" 
                      ? "bg-neutral-900 text-amber-300 font-bold border border-neutral-800" 
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Classic Zoya
                </button>
              </div>
            </div>

            {/* Atmos Neon Color Theme picker */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Atmosphere Neon Glow</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-900">
                {(["amber", "cyber", "crimson", "gold", "emerald"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNeonTheme(t)}
                    className={`py-1.5 px-2 text-[9px] font-mono uppercase tracking-wide rounded-lg flex items-center justify-center gap-1.5 border transition ${
                      neonTheme === t 
                        ? "bg-neutral-900 text-amber-300 font-bold border-neutral-800" 
                        : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      t === "amber" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                      t === "cyber" ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" :
                      t === "crimson" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" :
                      t === "gold" ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" : 
                      "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    }`} />
                    {t === "amber" ? "Classic" :
                     t === "cyber" ? "Cyber" :
                     t === "crimson" ? "Crimson" :
                     t === "gold" ? "Gold" : "Emerald"}
                  </button>
                ))}
              </div>
            </div>

            {/* Core Output Sliders */}
            <div className="flex flex-col gap-4">
              {/* Speed Preset */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 flex justify-between">
                  <span>Speech Delivery pacing</span>
                  <span className="text-amber-400 font-bold">{speechSpeed}</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl">
                  {["Slow", "Normal", "Fast"].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSpeechSpeed(speed)}
                      className={`py-1.5 text-[9px] font-mono uppercase rounded-lg transition ${
                        speechSpeed === speed 
                          ? "bg-neutral-900 text-neutral-200 font-bold" 
                          : "text-neutral-600 hover:text-neutral-400"
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume simulation level */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  <span>Target Voice Comfort level</span>
                  <span className="text-rose-400 font-bold">{voiceVolume}%</span>
                </div>
                <input 
                  type="range"
                  min="30"
                  max="100"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Chat Initiator suggestion cards */}
          <div className="bg-[#0b0b0b]/60 border border-neutral-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl flex-1 justify-center">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-900">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Conversation Prompts</span>
            </div>
            
            <p className="subtitle text-[10px] text-neutral-500 leading-relaxed uppercase tracking-wider">
              Select any curated petition card below to communicate with Zoya instantly.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {conversationStarters.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleTextCommand(starter.text)}
                  className="w-full text-left p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-900 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition flex items-center justify-between group"
                >
                  <span className="text-xs text-neutral-300 font-serif italic group-hover:text-amber-200 transition">
                    {starter.label}
                  </span>
                  <Sparkles className="w-3 h-3 text-neutral-600 group-hover:text-amber-400 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL B (CENTER): Portal Visualizer (Always core view on web, toggle on mobile) */}
        <div className={`flex-1 flex flex-col items-center justify-center relative ${
          activeMobileTab === "visualizer" ? "flex" : "hidden md:flex"
        }`}>
          {/* Fine Elegant state indicator tag header */}
          <motion.div 
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className={`absolute top-4 flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-900 bg-neutral-950 shadow-md backdrop-blur-md z-30 transition-all ${currentTheme.glow}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${currentTheme.barColor}`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentTheme.barColor}`} />
            </span>
            <span className="tracking-[0.2em] uppercase text-[9px] font-mono font-bold text-neutral-300">
              {appState === "idle" ? "READY FOR VOICE" : appState === "listening" ? "Listening Carefully" : appState === "processing" ? "Formulating reply" : "Zoya is Speaking"}
            </span>
          </motion.div>

          {/* Liquid Glass Voice Orb */}
          <div className="w-full h-full flex items-center justify-center">
            <Visualizer state={appState} theme={neonTheme} />
          </div>

          {/* Under-Orb subtle voice note */}
          <div className="absolute bottom-5 text-center pointer-events-none select-none">
            <p className="text-xs font-serif font-light text-neutral-400 italic tracking-wider">
              {appState === "idle" ? "Suno na, say hello to start our chat!" : appState === "listening" ? "Speak naturally. I am listening..." : appState === "processing" ? "Let me think..." : "Listen to my voice..."}
            </p>
          </div>
        </div>

        {/* PANEL C (RIGHT): Modern Interactive Memory Streams (Chat Logs) */}
        <div className={`w-full md:w-[32%] xl:w-[26dvw] flex flex-col justify-between h-full bg-[#0b0b0b]/60 border border-neutral-900 p-5 rounded-3xl shadow-xl z-10 ${
          activeMobileTab === "history" ? "flex" : "hidden md:flex"
        } hover:border-neutral-800 transition duration-500`}>
          
          {/* Memories panel header */}
          <div className="flex justify-between items-center pb-3 border-b border-neutral-900 shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Active Logs</span>
            </div>
            
            <div className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
              SYNAPSE FEED
            </div>
          </div>

          {/* Conversation feeds */}
          <div className="flex-1 w-full overflow-y-auto py-4 flex flex-col gap-4 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 gap-3 px-4 py-8">
                <MessageSquareShare className="w-8 h-8 text-neutral-600 stroke-1" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400">LOG EMPTY</span>
                <p className="text-[10px] font-serif italic text-neutral-500 leading-relaxed">
                  Start speaking or write a manual input to initiate the chat transcript memory feeds.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col w-[94%] ${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-wider font-mono text-neutral-500 mb-1 flex items-center gap-1.5 px-1">
                    {msg.sender === "user" ? (
                      <>
                        <User className="w-2.5 h-2.5 text-neutral-600" />
                        Razaul
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        Zoya
                      </>
                    )}
                  </span>
                  
                  <div 
                    className={`p-3 rounded-2xl text-xs md:text-sm shadow-sm transition leading-relaxed font-sans ${
                      msg.sender === "user" 
                        ? "bg-neutral-900 text-neutral-200 rounded-tr-none border border-neutral-850"
                        : "bg-neutral-950 text-amber-100/90 rounded-tl-none border border-neutral-900/60"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer state display in logs */}
          <div className="pt-3 border-t border-neutral-905 shrink-0 flex items-center justify-between opacity-50">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-mono uppercase text-neutral-400">Synapse Core Stable</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 font-semibold">{messages.length} lines</span>
          </div>

        </div>

      </main>

      {/* FOOTER CONTROLS: Hologram Voice Controller */}
      <footer className="w-full flex flex-col items-center justify-center pb-6 md:pb-10 pt-2 shrink-0 gap-5 px-6 z-50">
        
        {/* Manual typing override container overlay */}
        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-lg flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-2 pl-4 shadow-2xl relative"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a thoughtful query to Zoya..."
                className="flex-1 bg-transparent border-none outline-none text-neutral-200 placeholder:text-neutral-600 text-sm font-sans"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 hover:text-white disabled:opacity-30 disabled:grayscale transition cursor-pointer"
              >
                <Send size={15} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* PRIMARY IMPERIAL ACTIVE FOOT CONTROL ACTIVATOR */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 p-1.5 rounded-full bg-neutral-950 border border-neutral-900 shadow-xl relative">
            
            {/* Call Action Button Activator */}
            <button
              onClick={toggleListening}
              className={`
                group relative flex items-center gap-3 px-8 py-3.5 rounded-full font-sans font-bold tracking-widest transition-all duration-350 cursor-pointer
                ${
                  isSessionActive
                    ? "bg-rose-950/60 text-rose-200 border border-rose-500/30 hover:bg-rose-900/50"
                    : "bg-white text-black hover:bg-neutral-100 font-extrabold active:scale-95"
                }
              `}
            >
              <div className="flex items-center gap-2">
                {isSessionActive ? (
                  <>
                    <MicOff size={16} strokeWidth={2.5} className="text-rose-400" />
                    <span className="uppercase text-[9px] tracking-widest font-mono">End Conversation</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} strokeWidth={2.5} className="text-black group-hover:scale-105" />
                    <span className="uppercase text-[9px] tracking-widest font-mono">Tap & Speak</span>
                  </>
                )}
              </div>
            </button>

            {/* Manual Text toggle button overriding keyboard */}
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className={`
                p-3.5 rounded-full transition duration-300 border cursor-pointer
                ${showTextInput 
                   ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                   : "bg-neutral-900 border-neutral-850 text-neutral-500 hover:text-neutral-200"
                }
              `}
              title="Manual Text entry"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>

        {/* Professional, modern clean footer signet */}
        <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-neutral-600 select-none pb-1 hidden md:block">
          Lord Zoya voice workspace &bull; Developed with Love for Razaul
        </span>

      </footer>
    </div>
  );
}
