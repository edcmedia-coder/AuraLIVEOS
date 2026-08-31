"use client";

import React from "react";
import { SessionState } from "@/services/realtimeVoice/RealtimeVoiceSessionManager";
import { Mic, MicOff, PhoneOff, MessageSquare, Grid, Zap } from "lucide-react";

interface VoiceControlsProps {
  sessionState: SessionState;
  isMuted: boolean;
  onToggleSession: () => void;
  onToggleMute: () => void;
  onOpenCamera: () => void;
  onOpenDocument: () => void;
  onManualInterrupt: () => void;
}

export function VoiceControls({
  sessionState,
  isMuted,
  onToggleSession,
  onToggleMute,
  onOpenCamera,
  onOpenDocument,
  onManualInterrupt,
}: VoiceControlsProps) {
  const isLive = sessionState !== "IDLE" && sessionState !== "ERROR";

  return (
    <div className="w-full flex flex-col items-center pb-2">
      {/* Tap to Speak Area */}
      <div className="relative flex items-center justify-between w-full px-2">
        {/* Left Action Button (Chat) */}
        <button className="flex flex-col items-center space-y-2 transition-all hover:scale-110 active:scale-95 group mt-4">
          <div className="w-14 h-14 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:border-primary/50">
            <MessageSquare className="w-6 h-6 text-zinc-300 group-hover:text-white" />
          </div>
          <span className="text-[11px] font-medium text-zinc-300">Chat</span>
        </button>

        {/* Central Glowing Mic Button */}
        <div className="relative flex flex-col items-center group -mt-4">
          {/* Horizontal Waveform Line behind mic (Simulated) */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[280px] h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent -z-10" />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[140px] h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent -z-10 blur-sm" />

          <button
            onClick={onToggleSession}
            className={`relative z-10 w-[100px] h-[100px] rounded-full border-[3px] flex items-center justify-center transition-all duration-500 shadow-2xl ${
              isLive 
                ? "bg-black/60 border-primary shadow-[0_0_50px_rgba(0,229,255,0.6)] animate-pulse" 
                : "bg-black/60 border-primary shadow-[0_0_30px_rgba(0,229,255,0.4)]"
            }`}
          >
            <div className={`absolute inset-0 rounded-full border border-primary/50 ${isLive ? 'animate-ping opacity-20' : 'opacity-0'}`} />
            {isLive ? (
              <Zap className="w-10 h-10 text-white fill-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </button>

          <div className="mt-4 text-center">
             <span className="text-[14px] font-medium text-zinc-200">
               {isLive ? "Active Pulse" : "Tap to speak"}
             </span>
          </div>
        </div>

        {/* Right Action Button (Tools) */}
        <button 
          onClick={onOpenDocument}
          className="flex flex-col items-center space-y-2 transition-all hover:scale-110 active:scale-95 group mt-4"
        >
          <div className="w-14 h-14 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:border-primary/50">
            <Grid className="w-6 h-6 text-zinc-300 group-hover:text-white" />
          </div>
          <span className="text-[11px] font-medium text-zinc-300">Tools</span>
        </button>
      </div>

      {/* Secondary Controls (Mute, End) */}
      {isLive && (
        <div className="flex items-center space-x-4">
           <button
            onClick={onToggleMute}
            className={`p-3 rounded-2xl border transition-all ${
              isMuted ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-black/40 border-white/10 text-zinc-400"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={onToggleSession}
            className="p-3 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
