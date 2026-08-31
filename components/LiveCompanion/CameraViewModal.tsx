"use client";

import React, { useRef, useEffect, useState } from "react";
import { Camera, X, RefreshCw, Eye } from "lucide-react";

interface CameraViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureFrame: (base64Image: string, isAuto?: boolean) => void;
}

export function CameraViewModal({ isOpen, onClose, onCaptureFrame }: CameraViewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [autoStream, setAutoStream] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      return;
    }

    async function initCam() {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        setStream(ms);
        if (videoRef.current) {
          videoRef.current.srcObject = ms;
        }
      } catch (e) {
        console.error("[Camera Error]", e);
      }
    }

    initCam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Auto stream 1 frame per second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoStream && isOpen) {
      interval = setInterval(() => {
        capture();
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [autoStream, isOpen]);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64 = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
      if (base64) {
        onCaptureFrame(base64, autoStream);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm text-zinc-100">Live Camera Vision</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Feed */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {autoStream && (
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-500/80 text-white text-[10px] font-semibold tracking-wider uppercase animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>LIVE AI STREAM</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 flex items-center justify-between space-x-3 bg-zinc-950">
          <button
            onClick={() =>
              setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
            }
            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={capture}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>Ask AI "What is this?"</span>
          </button>

          <button
            onClick={() => setAutoStream(!autoStream)}
            className={`px-3 py-3 rounded-2xl border text-xs font-semibold transition-all ${
              autoStream
                ? "bg-red-950/60 border-red-500/50 text-red-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            {autoStream ? "Stop Feed" : "Auto Feed"}
          </button>
        </div>
      </div>
    </div>
  );
}
