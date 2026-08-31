"use client";

import React from "react";

interface AudioVisualizerProps {
  userVolume: number;
  aiVolume: number;
  sessionState: string;
  mini?: boolean;
}

export function AudioVisualizer({ userVolume, aiVolume, sessionState, mini }: AudioVisualizerProps) {
  const bars = mini ? 12 : 24;

  return (
    <div className={`flex items-center justify-center space-x-0.5 ${mini ? "h-6 w-full" : "h-10 w-full max-w-sm mx-auto"}`}>
      {Array.from({ length: bars }).map((_, i) => {
        let heightPct = 10;

        if (sessionState === "USER_SPEAKING") {
          const factor = Math.sin((i / bars) * Math.PI) * userVolume * 150;
          heightPct = Math.max(10, Math.min(100, factor));
        } else if (sessionState === "AI_SPEAKING") {
          const factor = Math.cos((i / bars) * Math.PI) * aiVolume * 180;
          heightPct = Math.max(10, Math.min(100, Math.abs(factor)));
        }

        const isUser = sessionState === "USER_SPEAKING";
        const isAi = sessionState === "AI_SPEAKING";

        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-75 ${mini ? "w-0.5" : "w-1"}`}
            style={{
              height: `${heightPct}%`,
              minHeight: "2px",
              backgroundColor: isUser || isAi ? "#00e5ff" : "rgba(255,255,255,0.1)",
              boxShadow: isUser || isAi ? "0 0 8px #00e5ff" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
