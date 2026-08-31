"use client";

import React, { useEffect, useRef } from "react";
import { SessionState } from "@/services/realtimeVoice/RealtimeVoiceSessionManager";

interface AuraAvatarProps {
  sessionState: SessionState;
  userVolume: number;
  aiVolume: number;
  highRefresh?: boolean;
}

export function AuraAvatar({
  sessionState,
  userVolume,
  aiVolume,
  highRefresh = true,
}: AuraAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.28;

      ctx.clearRect(0, 0, width, height);

      phase += 0.03;

      // Outer Ambient Glow
      const ambientGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius * 1.8
      );

      if (sessionState === "AI_SPEAKING") {
        const energy = Math.min(1, aiVolume * 3);
        ambientGlow.addColorStop(0, `rgba(99, 102, 241, ${0.4 + energy * 0.4})`);
        ambientGlow.addColorStop(0.5, `rgba(168, 85, 247, ${0.2 + energy * 0.3})`);
        ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (sessionState === "USER_SPEAKING") {
        const energy = Math.min(1, userVolume * 4);
        ambientGlow.addColorStop(0, `rgba(6, 182, 212, ${0.4 + energy * 0.5})`);
        ambientGlow.addColorStop(0.6, `rgba(16, 185, 129, ${0.2 + energy * 0.3})`);
        ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (sessionState === "INTERRUPTED") {
        ambientGlow.addColorStop(0, "rgba(239, 68, 68, 0.6)");
        ambientGlow.addColorStop(0.5, "rgba(245, 158, 11, 0.3)");
        ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (sessionState === "PROCESSING") {
        ambientGlow.addColorStop(0, "rgba(139, 92, 246, 0.5)");
        ambientGlow.addColorStop(0.6, "rgba(236, 72, 153, 0.2)");
        ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        const breathe = (Math.sin(phase) + 1) * 0.15;
        ambientGlow.addColorStop(0, `rgba(79, 70, 229, ${0.2 + breathe})`);
        ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Multi-Layer Organic Waveform Rings
      const numRings = sessionState === "AI_SPEAKING" || sessionState === "USER_SPEAKING" ? 4 : 2;

      for (let ring = 0; ring < numRings; ring++) {
        ctx.beginPath();
        const ringRadius = radius + ring * 12;
        const points = 60;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          let distortion = 0;

          if (sessionState === "AI_SPEAKING") {
            const wave = Math.sin(angle * 6 + phase * 2 + ring) * aiVolume * 45;
            distortion = wave;
          } else if (sessionState === "USER_SPEAKING") {
            const wave = Math.cos(angle * 5 - phase * 3 + ring) * userVolume * 50;
            distortion = wave;
          } else if (sessionState === "PROCESSING") {
            distortion = Math.sin(angle * 8 + phase * 4) * 8;
          } else {
            distortion = Math.sin(angle * 4 + phase) * 4;
          }

          const r = ringRadius + distortion;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.lineWidth = 2 - ring * 0.4;

        if (sessionState === "AI_SPEAKING") {
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.8 - ring * 0.18})`;
        } else if (sessionState === "USER_SPEAKING") {
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.9 - ring * 0.2})`;
        } else if (sessionState === "INTERRUPTED") {
          ctx.strokeStyle = "rgba(248, 113, 113, 0.9)";
        } else {
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.5 - ring * 0.15})`;
        }

        ctx.stroke();
      }

      // Core Avatar Orb
      const coreGradient = ctx.createRadialGradient(
        centerX - radius * 0.2,
        centerY - radius * 0.2,
        0,
        centerX,
        centerY,
        radius
      );

      if (sessionState === "AI_SPEAKING") {
        coreGradient.addColorStop(0, "#c084fc");
        coreGradient.addColorStop(0.5, "#818cf8");
        coreGradient.addColorStop(1, "#312e81");
      } else if (sessionState === "USER_SPEAKING") {
        coreGradient.addColorStop(0, "#22d3ee");
        coreGradient.addColorStop(0.5, "#0284c7");
        coreGradient.addColorStop(1, "#0c4a6e");
      } else if (sessionState === "INTERRUPTED") {
        coreGradient.addColorStop(0, "#f87171");
        coreGradient.addColorStop(0.6, "#dc2626");
        coreGradient.addColorStop(1, "#450a0a");
      } else {
        coreGradient.addColorStop(0, "#a5b4fc");
        coreGradient.addColorStop(0.6, "#6366f1");
        coreGradient.addColorStop(1, "#1e1b4b");
      }

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Orbiting Nodes
      if (sessionState !== "IDLE") {
        const orbitRadius = radius * 1.25;
        const speed = sessionState === "PROCESSING" ? 3 : 1;
        const nodeAngle = phase * speed;

        for (let k = 0; k < 3; k++) {
          const a = nodeAngle + (k * Math.PI * 2) / 3;
          const nx = centerX + Math.cos(a) * orbitRadius;
          const ny = centerY + Math.sin(a) * orbitRadius;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [sessionState, userVolume, aiVolume, highRefresh]);

  return (
    <div className="relative flex items-center justify-center w-full h-44 xs:h-52 sm:h-60 my-1 shrink-0">
      <canvas ref={canvasRef} className="w-full h-full max-w-sm cursor-pointer" />
    </div>
  );
}
