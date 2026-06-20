import { motion } from "motion/react";
import React from "react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";
type NeonTheme = "amber" | "cyber" | "crimson" | "gold" | "emerald";

interface VisualizerProps {
  state: VisualizerState;
  theme?: NeonTheme;
}

export default function Visualizer({ state, theme = "amber" }: VisualizerProps) {
  // Fluid gradients & blur sizes based on active voice loop state and selected neon theme
  const getTheme = () => {
    switch (theme) {
      case "cyber":
        switch (state) {
          case "listening":
            return {
              glowColor: "rgba(59, 130, 246, 0.45)",
              color1: "from-blue-600/80",
              color2: "to-cyan-500/80",
              coreBg: "bg-gradient-to-tr from-blue-950 via-slate-900 to-cyan-950",
              ringBorder: "border-blue-500/30",
              accentGlow: "rgba(59, 130, 246, 0.3)"
            };
          case "processing":
            return {
              glowColor: "rgba(6, 182, 212, 0.4)",
              color1: "from-cyan-500/80",
              color2: "to-teal-400/80",
              coreBg: "bg-gradient-to-tr from-cyan-950 via-slate-900 to-teal-950",
              ringBorder: "border-cyan-500/30",
              accentGlow: "rgba(6, 182, 212, 0.3)"
            };
          case "speaking":
            return {
              glowColor: "rgba(217, 70, 239, 0.55)",
              color1: "from-fuchsia-500/80",
              color2: "to-purple-500/80",
              coreBg: "bg-gradient-to-tr from-fuchsia-950 via-slate-900 to-purple-950",
              ringBorder: "border-fuchsia-400/30",
              accentGlow: "rgba(217, 70, 239, 0.45)"
            };
          default:
            return {
              glowColor: "rgba(59, 130, 246, 0.25)",
              color1: "from-blue-600/60",
              color2: "to-cyan-500/50",
              coreBg: "bg-gradient-to-tr from-blue-950/40 via-neutral-900/40 to-cyan-950/40",
              ringBorder: "border-blue-500/15",
              accentGlow: "rgba(59, 130, 246, 0.15)"
            };
        }

      case "crimson":
        switch (state) {
          case "listening":
            return {
              glowColor: "rgba(239, 68, 68, 0.45)",
              color1: "from-red-600/80",
              color2: "to-rose-500/80",
              coreBg: "bg-gradient-to-tr from-red-950 via-slate-900 to-rose-950",
              ringBorder: "border-red-500/30",
              accentGlow: "rgba(239, 68, 68, 0.3)"
            };
          case "processing":
            return {
              glowColor: "rgba(249, 115, 22, 0.4)",
              color1: "from-orange-500/80",
              color2: "to-amber-500/80",
              coreBg: "bg-gradient-to-tr from-orange-950 via-slate-900 to-amber-950",
              ringBorder: "border-orange-500/30",
              accentGlow: "rgba(249, 115, 22, 0.3)"
            };
          case "speaking":
            return {
              glowColor: "rgba(168, 85, 247, 0.55)",
              color1: "from-purple-500/80",
              color2: "to-pink-500/80",
              coreBg: "bg-gradient-to-tr from-purple-950 via-slate-900 to-pink-950",
              ringBorder: "border-purple-400/30",
              accentGlow: "rgba(168, 85, 247, 0.45)"
            };
          default:
            return {
              glowColor: "rgba(239, 68, 68, 0.25)",
              color1: "from-red-600/60",
              color2: "to-rose-500/50",
              coreBg: "bg-gradient-to-tr from-red-950/40 via-neutral-900/40 to-rose-950/40",
              ringBorder: "border-red-500/15",
              accentGlow: "rgba(239, 68, 68, 0.15)"
            };
        }

      case "gold":
        switch (state) {
          case "listening":
            return {
              glowColor: "rgba(234, 179, 8, 0.45)",
              color1: "from-yellow-500/80",
              color2: "to-amber-400/80",
              coreBg: "bg-gradient-to-tr from-yellow-950 via-slate-900 to-amber-950",
              ringBorder: "border-yellow-500/30",
              accentGlow: "rgba(234, 179, 8, 0.3)"
            };
          case "processing":
            return {
              glowColor: "rgba(245, 158, 11, 0.4)",
              color1: "from-amber-500/80",
              color2: "to-orange-500/80",
              coreBg: "bg-gradient-to-tr from-amber-950 via-slate-900 to-orange-950",
              ringBorder: "border-amber-500/30",
              accentGlow: "rgba(245, 158, 11, 0.3)"
            };
          case "speaking":
            return {
              glowColor: "rgba(244, 63, 94, 0.55)",
              color1: "from-rose-500/80",
              color2: "to-amber-500/80",
              coreBg: "bg-gradient-to-tr from-rose-950 via-slate-900 to-amber-950",
              ringBorder: "border-rose-400/30",
              accentGlow: "rgba(244, 63, 94, 0.45)"
            };
          default:
            return {
              glowColor: "rgba(234, 179, 8, 0.25)",
              color1: "from-yellow-600/60",
              color2: "to-amber-500/50",
              coreBg: "bg-gradient-to-tr from-yellow-950/40 via-neutral-900/40 to-amber-950/40",
              ringBorder: "border-yellow-500/15",
              accentGlow: "rgba(234, 179, 8, 0.15)"
            };
        }

      case "emerald":
        switch (state) {
          case "listening":
            return {
              glowColor: "rgba(16, 185, 129, 0.45)",
              color1: "from-emerald-600/80",
              color2: "to-green-500/80",
              coreBg: "bg-gradient-to-tr from-emerald-950 via-slate-900 to-green-950",
              ringBorder: "border-emerald-500/30",
              accentGlow: "rgba(16, 185, 129, 0.3)"
            };
          case "processing":
            return {
              glowColor: "rgba(20, 184, 166, 0.4)",
              color1: "from-teal-500/80",
              color2: "to-emerald-500/80",
              coreBg: "bg-gradient-to-tr from-teal-950 via-slate-900 to-emerald-950",
              ringBorder: "border-teal-500/30",
              accentGlow: "rgba(20, 184, 166, 0.3)"
            };
          case "speaking":
            return {
              glowColor: "rgba(132, 204, 22, 0.55)",
              color1: "from-lime-500/80",
              color2: "to-emerald-500/80",
              coreBg: "bg-gradient-to-tr from-lime-950 via-slate-900 to-emerald-950",
              ringBorder: "border-lime-400/30",
              accentGlow: "rgba(132, 204, 22, 0.45)"
            };
          default:
            return {
              glowColor: "rgba(16, 185, 129, 0.25)",
              color1: "from-emerald-600/60",
              color2: "to-green-500/50",
              coreBg: "bg-gradient-to-tr from-emerald-950/40 via-neutral-900/40 to-green-950/40",
              ringBorder: "border-emerald-500/15",
              accentGlow: "rgba(16, 185, 129, 0.15)"
            };
        }

      case "amber":
      default:
        switch (state) {
          case "listening": // Soft Royal Lavender/Violet
            return {
              glowColor: "rgba(139, 92, 246, 0.45)",
              color1: "from-violet-600/80",
              color2: "to-fuchsia-500/80",
              coreBg: "bg-gradient-to-tr from-violet-950 via-slate-900 to-indigo-950",
              ringBorder: "border-violet-500/30",
              accentGlow: "rgba(167, 139, 250, 0.3)"
            };
          case "processing": // Elegant Gold / Champagne Flow
            return {
              glowColor: "rgba(245, 158, 11, 0.4)",
              color1: "from-amber-500/80",
              color2: "to-orange-400/80",
              coreBg: "bg-gradient-to-tr from-amber-950 via-slate-900 to-orange-950",
              ringBorder: "border-amber-500/30",
              accentGlow: "rgba(251, 191, 36, 0.3)"
            };
          case "speaking": // Luxury Rose / Sunset Pink
            return {
              glowColor: "rgba(244, 63, 94, 0.55)",
              color1: "from-rose-500/80",
              color2: "to-pink-500/80",
              coreBg: "bg-gradient-to-tr from-rose-950 via-slate-900 to-pink-950",
              ringBorder: "border-rose-400/30",
              accentGlow: "rgba(251, 113, 133, 0.45)"
            };
          default: // Elegant Warm Amber Ambient Breathing
            return {
              glowColor: "rgba(217, 119, 6, 0.25)",
              color1: "from-amber-600/60",
              color2: "to-yellow-500/50",
              coreBg: "bg-gradient-to-tr from-orange-950/40 via-neutral-900/40 to-amber-950/40",
              ringBorder: "border-amber-500/15",
              accentGlow: "rgba(217, 119, 6, 0.15)"
            };
        }
    }
  };

  const activeTheme = getTheme();

  // Pulse scales based on speaking/listening intensity
  const getOrbScale = () => {
    switch (state) {
      case "speaking":
        return [1, 1.12, 0.96, 1.15, 1];
      case "listening":
        return [1, 1.05, 0.98, 1.04, 1];
      case "processing":
        return [0.97, 1.03, 0.97];
      default:
        return [1, 1.02, 1];
    }
  };

  const getWaveTransition = (delay: number) => {
    let baseDuration = 4;
    if (state === "speaking") baseDuration = 1.2;
    else if (state === "listening") baseDuration = 2.2;
    else if (state === "processing") baseDuration = 0.8;

    return {
      duration: baseDuration,
      repeat: Infinity,
      ease: "easeInOut",
      delay
    };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
      
      {/* BACKGROUND ATMOSPHERIC RADIAL GLOW */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.15, 1] : state === "listening" ? [1, 1.08, 1] : 1,
          opacity: state === "idle" ? 0.3 : 0.6
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full blur-[110px] transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${activeTheme.glowColor} 0%, rgba(0,0,0,0) 70%)`
        }}
      />

      {/* THREE LAYERED LIQUID MORPHING BLOBS */}
      <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] flex items-center justify-center pointer-events-none">
        
        {/* Outer Blobs (Morphing dynamic gradient shadows) */}
        <motion.div
          animate={{
            scale: getOrbScale(),
            rotate: [0, 120, 240, 360],
            borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
          }}
          transition={getWaveTransition(0)}
          className={`absolute inset-4 bg-gradient-to-br ${activeTheme.color1} ${activeTheme.color2} mix-blend-screen opacity-20 blur-md`}
        />

        <motion.div
          animate={{
            scale: getOrbScale().map(s => s * 0.9),
            rotate: [360, 240, 120, 0],
            borderRadius: ["50% 50% 30% 70% / 50% 60% 40% 50%", "30% 70% 70% 30% / 50% 30% 70% 50%", "50% 50% 30% 70% / 50% 60% 40% 50%"]
          }}
          transition={getWaveTransition(0.3)}
          className={`absolute inset-10 bg-gradient-to-tr ${activeTheme.color2} ${activeTheme.color1} mix-blend-screen opacity-25 blur-sm`}
        />

        <motion.div
          animate={{
            scale: getOrbScale().map(s => s * 0.8),
            rotate: [180, 360, 0, 180],
            borderRadius: ["60% 40% 60% 40% / 40% 60% 40% 60%", "45% 55% 45% 55% / 55% 45% 55% 45%", "60% 40% 60% 40% / 40% 60% 40% 60%"]
          }}
          transition={getWaveTransition(0.6)}
          className={`absolute inset-[70px] bg-gradient-to-r ${activeTheme.color1} ${activeTheme.color2} mix-blend-screen opacity-30`}
        />
        
        {/* Soft elegant perimeter border rings */}
        <div className={`absolute inset-[20px] rounded-full border border-dashed ${activeTheme.ringBorder} opacity-20`} />
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[50px] rounded-full border border-dotted ${activeTheme.ringBorder} opacity-30`}
        />
      </div>

      {/* DYNAMIC SPHERE CORE */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.05, 0.98, 1.04, 1] : 1
        }}
        transition={{ duration: 0.5, repeat: state === "speaking" ? Infinity : 0, ease: "easeInOut" }}
        className="relative w-[130px] h-[130px] md:w-[160px] md:h-[160px] rounded-full flex items-center justify-center shadow-[0_15px_45px_rgba(0,0,0,0.85)] border border-white/10 z-10 overflow-hidden"
        style={{
          boxShadow: `0 0 45px rgba(0, 0, 0, 0.9), inset 0 0 25px ${activeTheme.accentGlow}`
        }}
      >
        {/* Internal Backdrop Blur with Glass reflection overlay */}
        <div className={`absolute inset-0 ${activeTheme.coreBg} backdrop-blur-2xl transition-all duration-700`} />
        
        <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/10 to-transparent" />

        {/* Minimalist Professional Core Indicator Graphic */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          
          {/* Wave line equalizer form */}
          <div className="flex gap-[4px] items-end h-[16px] mb-2 scale-105">
            {[...Array(5)].map((_, idx) => (
              <motion.div
                key={idx}
                animate={{
                  height: state === "speaking" ? [4, 20, 4] : state === "listening" ? [3, 11, 3] : state === "processing" ? [2, 14, 2] : [3, 5, 3]
                }}
                transition={{
                  duration: 0.45 + idx * 0.08,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 0.05
                }}
                className={`w-[3px] rounded-sm bg-white/80`}
              />
            ))}
          </div>

          <span className="font-sans font-bold tracking-[0.25em] text-xs text-white uppercase drop-shadow-sm select-none">
            {state === "idle" ? "ZOYA" : state}
          </span>
          
          <span className="text-[6px] tracking-[0.4em] font-mono text-white/40 uppercase mt-1 select-none font-semibold">
            {state === "idle" ? "READY" : "LIVE FEED"}
          </span>

        </div>
        
        {/* Fine high-contrast edge rim light */}
        <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
      </motion.div>

    </div>
  );
}
