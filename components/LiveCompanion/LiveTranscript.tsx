"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { TranscriptItem } from "@/services/realtimeVoice/RealtimeVoiceSessionManager";
import Image from "next/image";

interface LiveTranscriptProps {
  transcripts: TranscriptItem[];
  userName: string;
}

export function LiveTranscript({ transcripts, userName }: LiveTranscriptProps) {
  const avatarImg = "/src/assets/images/edc_live_avatar_bg_1787881388569.jpg";
  const lastTranscript = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;

  if (!lastTranscript) {
    return (
      <div className="flex flex-col p-4 bg-[#111625]/90 backdrop-blur-2xl rounded-3xl border border-white/10 w-full shadow-2xl relative">
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-[#111625] border-l border-white/10 border-b border-white/10 rotate-45 transform origin-center z-10" />
        <div className="flex items-start space-x-3 z-20">
           <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0">
             <Image src={avatarImg} alt="Avatar" fill className="object-cover" />
           </div>
           <div className="flex flex-col justify-center py-1">
             <span className="text-sm font-bold text-white">Hey Corey! 👋</span>
             <p className="text-zinc-300 text-[13px] leading-snug mt-1">
               I'm listening... what can we work on<br/>together today?
             </p>
           </div>
        </div>
      </div>
    );
  }

  const isAi = lastTranscript.speaker === "ai";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col p-4 bg-[#111625]/90 backdrop-blur-2xl rounded-3xl border border-white/10 w-full shadow-2xl relative"
    >
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#111625] border-l border-white/10 border-b border-white/10 rotate-45 transform origin-center z-10" />
      
      <div className="flex items-start space-x-3 z-20">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0">
           <Image 
             src={avatarImg} 
             alt="Avatar" 
             fill 
             className="object-cover" 
           />
        </div>
        
        <div className="flex flex-col justify-center py-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">
              {isAi ? `Hey ${userName}!` : userName}
              {isAi && " 👋"}
            </span>
          </div>
          <p className="text-zinc-300 text-[13px] leading-snug mt-1 break-words">
            {lastTranscript.text}
            {lastTranscript.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-white/60 animate-pulse align-middle" />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
