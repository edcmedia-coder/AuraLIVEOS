"use client";

import React from "react";
import { Activity, Radio, Cpu, Sparkles } from "lucide-react";

interface HeaderProps {
  sessionState: string;
  bargeInLatencyMs: number;
  firstAudioLatencyMs: number;
  voiceName: string;
}

export function Header({
  sessionState,
}: HeaderProps) {
  const isLive = sessionState === "AI_SPEAKING" || sessionState === "LISTENING" || sessionState === "USER_SPEAKING";

  return (
    <header className="absolute top-0 left-0 right-0 z-40 shrink-0 flex items-center justify-between px-6 py-4 bg-transparent w-full">
      {/* Time placeholder for realism */}
      <div className="flex items-center space-x-1.5">
        <span className="text-[15px] font-semibold text-white tracking-wide">9:41</span>
      </div>

      {/* EDC Live Online Badge */}
      <div className="flex items-center space-x-3 px-3 py-1.5 rounded-[20px] bg-black/60 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 border border-primary/30">
           <span className="text-[12px] font-bold text-primary">
             <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary">
               <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M12 10L6 20H18L12 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           </span>
        </div>
        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-semibold text-white tracking-wide leading-tight">EDC Live</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
             <div className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-[#34d399]" : "bg-zinc-500"}`} />
             <span className="text-[9px] text-zinc-300 leading-none">
               {isLive ? "Online" : "Standby"}
             </span>
          </div>
        </div>
      </div>
    </header>
  );
}
