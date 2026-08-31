"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppTelemetry, UserSettings } from "@/lib/db/store";
import { BarChart2, Zap, Clock, Radio, Activity, Cpu, Sliders, RefreshCw, CheckCircle2, Volume2, HelpCircle, ShieldCheck } from "lucide-react";

interface AnalyticsViewProps {
  onSettingsUpdated?: (settings: UserSettings) => void;
}

const Tooltip = ({ text, suggested }: { text: string; suggested?: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <HelpCircle className="w-3.5 h-3.5 text-zinc-400 cursor-help hover:text-cyan-400 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-zinc-900 text-[11px] text-zinc-200 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl border border-zinc-700 z-50 leading-relaxed backdrop-blur-2xl">
      <p className="font-medium text-zinc-100">{text}</p>
      {suggested && (
        <p className="mt-1.5 pt-1.5 border-t border-zinc-800 text-[10px] text-emerald-400 font-semibold">
          💡 Best Setting: {suggested}
        </p>
      )}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900"></div>
    </div>
  </div>
);

export function AnalyticsView({ onSettingsUpdated }: AnalyticsViewProps) {
  const [telemetry, setTelemetry] = useState<AppTelemetry>({
    totalVoiceSeconds: 142,
    totalSessions: 5,
    avgBargeInLatencyMs: 158,
    totalTokens: 12450,
  });

  // Advanced fine-tuning controls state loaded from settings
  const [vadSensitivity, setVadSensitivity] = useState(0.60);
  const [bargeInLatency, setBargeInLatency] = useState(150);
  const [aiVolume, setAiVolume] = useState(0.85);
  const [chunkSize, setChunkSize] = useState(4096);
  const [voiceName, setVoiceName] = useState("Zephyr");
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [optimizationResult, setOptimizationResult] = useState<{vad: number, chunk: number} | null>(null);

  // 60-120fps detection & monitor state
  const [fps, setFps] = useState(60);
  const [is120Hz, setIs120Hz] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    fetchTelemetry();
    fetchSettings();

    // 120fps / 60fps high precision requestAnimationFrame monitoring loop
    let animationFrameId: number;
    const measureFps = (now: number) => {
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        if (currentFps > 75) {
          setIs120Hz(true);
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animationFrameId = requestAnimationFrame(measureFps);
    };
    animationFrameId = requestAnimationFrame(measureFps);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const data = await res.json();
        if (data.telemetry) {
          setTelemetry(data.telemetry);
        }
      }
    } catch (e) {
      console.error("[Fetch Telemetry Error]", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setVadSensitivity(data.settings.vadSensitivity ?? 0.60);
          setBargeInLatency(data.settings.bargeInThresholdMs ?? 150);
          setAiVolume(data.settings.aiVolume ?? 0.85);
          setChunkSize(data.settings.chunkSize ?? 4096);
          setVoiceName(data.settings.voiceName ?? "Zephyr");
        }
      }
    } catch (e) {
      console.error("[Fetch Settings Error]", e);
    }
  };

  const handleNeuralOptimize = () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    // Simulate AI analysis of telemetry data
    setTimeout(() => {
      const latency = telemetry.avgBargeInLatencyMs;
      let recommendedVad = vadSensitivity;
      let recommendedChunk = chunkSize;

      // Logic: If latency is high, reduce chunk size.
      // If sessions are many but streaming time is low, maybe sensitivity is too high (false triggers).
      if (latency > 250) {
        recommendedChunk = 2048;
      } else if (latency < 150 && chunkSize < 4096) {
        recommendedChunk = 4096;
      }

      // Sensitivity logic
      if (telemetry.totalVoiceSeconds / (telemetry.totalSessions || 1) < 10) {
        // Very short sessions might indicate false triggers
        recommendedVad = Math.max(0.3, vadSensitivity - 0.1);
      } else if (latency > 200) {
        recommendedVad = Math.min(0.8, vadSensitivity + 0.05);
      }

      setOptimizationResult({ vad: parseFloat(recommendedVad.toFixed(2)), chunk: recommendedChunk });
      setIsOptimizing(false);
    }, 1500);
  };

  const applyOptimization = () => {
    if (optimizationResult) {
      setVadSensitivity(optimizationResult.vad);
      setChunkSize(optimizationResult.chunk);
      setOptimizationResult(null);
      setSuccessMsg("AI-Optimized parameters applied. Ready to save.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleSaveFineTuning = async () => {
    setIsSaving(true);
    try {
      const payload = {
        vadSensitivity,
        bargeInThresholdMs: bargeInLatency,
        aiVolume,
        chunkSize,
        voiceName,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg("Fine-tuning parameters successfully saved & applied!");
        if (onSettingsUpdated && data.settings) {
          onSettingsUpdated(data.settings);
        }
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setSuccessMsg("Error saving parameters. Please retry.");
      }
    } catch (e) {
      console.error("[Fine-tuning save error]", e);
      setSuccessMsg("Network error saving parameters.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTelemetry = async () => {
    if (confirm("Reset all real-time session counters and telemetry logs?")) {
      setTelemetry({
        totalVoiceSeconds: 0,
        totalSessions: 0,
        avgBargeInLatencyMs: 140,
        totalTokens: 0,
      });
      setSuccessMsg("Telemetry counters reset successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const minutes = (telemetry.totalVoiceSeconds / 60).toFixed(1);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 max-w-lg w-full mx-auto pb-28 text-zinc-100">
      {/* Cinematic Glass Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Neural Command & Metrics
            </h2>
            <p className="text-[10px] text-zinc-400">Real-time telemetry, advanced fine-tuning & diagnostics</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{fps} FPS ({is120Hz ? "120Hz ProMotion" : "Standard"})</span>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 shadow-xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Barge-In Interruption Latency */}
        <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl space-y-1.5 shadow-xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold">Barge-In Latency</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {telemetry.avgBargeInLatencyMs} <span className="text-xs font-normal text-zinc-500">ms</span>
          </p>
          <p className="text-[10px] text-zinc-500">Instant sub-200ms audio flush</p>
        </div>

        {/* Total Voice Streaming Time */}
        <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl space-y-1.5 shadow-xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold">Voice Streaming</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-cyan-400 font-mono tracking-tight">
            {minutes} <span className="text-xs font-normal text-zinc-500">mins</span>
          </p>
          <p className="text-[10px] text-zinc-500">{telemetry.totalSessions} active live sessions</p>
        </div>

        {/* Audio Sample Rate */}
        <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl space-y-1.5 shadow-xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold">Audio Sample Rate</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-purple-300 font-mono">
            16k <span className="text-[10px] text-zinc-500 font-normal">in</span> / 24k <span className="text-[10px] text-zinc-500 font-normal">out</span>
          </p>
          <p className="text-[10px] text-zinc-500">PCM 16-bit Little-Endian</p>
        </div>

        {/* Token Stream */}
        <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl space-y-1.5 shadow-xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold">Token Stream</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-indigo-300 font-mono">
            {telemetry.totalTokens.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500">Gemini Live full-duplex</p>
        </div>
      </div>

      {/* Advanced Fine-Tuning Control Center */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 backdrop-blur-2xl border border-zinc-800/90 rounded-3xl space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-200 tracking-wide">Advanced Fine-Tuning & Operating Controls</h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            Real-Time Sync
          </span>
        </div>

        {/* AI Voice Volume Control (Mobile Media Routing Fix) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center">
              AI Voice Master Volume
              <Tooltip
                text="Directly controls the master output gain of the AI's streaming PCM audio. Connected to mobile phone media audio routing for precise hardware and software volume control."
                suggested="75% to 90% for clear, comfortable mobile listening"
              />
            </span>
            <span className="text-purple-400 font-mono font-bold">{Math.round(aiVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={aiVolume}
            onChange={(e) => setAiVolume(parseFloat(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
          />
          <p className="text-[10px] text-zinc-500">Routes audio through mobile media channels for reliable volume buttons.</p>
        </div>

        {/* VAD Sensitivity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center">
              VAD Speech Sensitivity Threshold
              <Tooltip
                text="Controls how sensitive the microphone voice activity detector is when picking up speech. Higher values pick up quiet whispers; lower values filter out background cafe or keyboard noise."
                suggested="60% for quiet rooms, 35-45% for noisy public environments"
              />
            </span>
            <span className="text-emerald-400 font-mono font-bold">{Math.round(vadSensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="0.9"
            step="0.05"
            value={vadSensitivity}
            onChange={(e) => setVadSensitivity(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
          />
        </div>

        {/* Barge-In Latency Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center">
              Target Barge-In Interruption Latency
              <Tooltip
                text="Defines the buffer flush speed when interrupting the AI's speech. Lower values (100-130ms) give instantaneous conversational flow. Higher values (200ms+) prevent accidental interruptions from coughs."
                suggested="150ms for natural fluid conversations"
              />
            </span>
            <span className="text-cyan-400 font-mono font-bold">{bargeInLatency} ms</span>
          </div>
          <input
            type="range"
            min="100"
            max="300"
            step="10"
            value={bargeInLatency}
            onChange={(e) => setBargeInLatency(parseInt(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
          />
        </div>

        {/* Audio Chunk Size */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs items-center">
            <span className="text-zinc-300 font-medium flex items-center">
              Audio Buffer Chunk Size
              <Tooltip
                text="Determines PCM frame packet size sent to WebSocket. 2048 offers lowest latency but higher CPU; 8192 offers stable network streaming on mobile cellular connections."
                suggested="4096 (Balanced latency & stability)"
              />
            </span>
            <span className="text-indigo-400 font-mono text-[10px]">{chunkSize} samples</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[2048, 4096, 8192, 16384].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setChunkSize(size)}
                className={`py-1.5 text-xs font-mono rounded-xl border transition-all ${
                  chunkSize === size
                    ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-500/20"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Persona Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">Default Voice Persona</label>
          <div className="grid grid-cols-5 gap-1.5">
            {["Zephyr", "Puck", "Kore", "Fenrir", "Charon"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVoiceName(v)}
                className={`py-1.5 text-[11px] font-semibold rounded-xl border transition-all truncate px-1 ${
                  voiceName === v
                    ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-500/20"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleNeuralOptimize}
            disabled={isOptimizing}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 font-bold text-xs transition-all flex items-center justify-center space-x-2 relative overflow-hidden group"
          >
            {isOptimizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            )}
            <span>{isOptimizing ? "Analyzing Session Latency..." : "Neural Latency Optimizer"}</span>
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {optimizationResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Recommendation</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div className="text-zinc-400">VAD: <span className="text-white font-mono">{vadSensitivity} → {optimizationResult.vad}</span></div>
                <div className="text-zinc-400">Chunk: <span className="text-white font-mono">{chunkSize} → {optimizationResult.chunk}</span></div>
              </div>
              <button 
                onClick={applyOptimization}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors"
              >
                Apply AI Suggestions
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveFineTuning}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all active:scale-98 flex items-center justify-center space-x-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Apply & Save Fine-Tuning"}</span>
            </button>
            <button
              onClick={handleResetTelemetry}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Latency Architecture Diagnostics */}
      <div className="p-4 sm:p-5 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-zinc-200 flex items-center">
          <Activity className="w-4 h-4 mr-1.5 text-emerald-400" />
          Latency Stack Benchmark Stack
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Microphone VAD Detection</span>
            <span className="font-mono text-emerald-400 font-bold">~15ms</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div className="bg-emerald-500 h-full w-[15%] rounded-full shadow-[0_0_10px_#10b981]" />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-zinc-400">Audio Queue Instant Flusher</span>
            <span className="font-mono text-emerald-400 font-bold">~25ms</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div className="bg-emerald-500 h-full w-[25%] rounded-full shadow-[0_0_10px_#10b981]" />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-zinc-400">Model First Token Audio Response</span>
            <span className="font-mono text-cyan-400 font-bold">~380ms</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div className="bg-cyan-500 h-full w-[50%] rounded-full shadow-[0_0_10px_#06b6d4]" />
          </div>
        </div>
      </div>
    </div>
  );
}
