"use client";

import React, { useState, useEffect } from "react";
import { UserSettings } from "@/lib/db/store";
import { Settings, Cpu, Volume2, ShieldCheck, Sparkles, Check, Sliders, Info, HelpCircle, Zap } from "lucide-react";

interface SettingsViewProps {
  onSettingsUpdated: (settings: UserSettings) => void;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <HelpCircle className="w-3 h-3 text-zinc-500 cursor-help hover:text-zinc-300 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-zinc-800 text-[10px] text-zinc-300 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl border border-zinc-700 z-50 leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-800"></div>
    </div>
  </div>
);

export function SettingsView({ onSettingsUpdated }: SettingsViewProps) {
  const [settings, setSettings] = useState<UserSettings>({
    userName: "Alex",
    voiceName: "Zephyr",
    speed: 1.0,
    vadSensitivity: 0.6,
    bargeInThresholdMs: 180,
    aiVolume: 0.85,
    chunkSize: 4096,
    autoMemory: true,
    searchGrounding: true,
    highRefresh: true,
    personality: "Intelligent, warm, empathetic, concise, and highly responsive live conversational companion.",
    reducedMotion: false,
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (e) {
      console.error("[Fetch Settings Error]", e);
    }
  };

  const handleSave = async (updated: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updated };
    setSettings(newSettings);
    onSettingsUpdated(newSettings);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 1500);
      }
    } catch (e) {
      console.error("[Save Settings Error]", e);
    }
  };

  const voices = [
    { id: "Zephyr", name: "Zephyr (Natural Warm Male)", desc: "Deep, empathetic, fluid" },
    { id: "Kore", name: "Kore (Bright Professional Female)", desc: "Clear, expressive, articulate" },
    { id: "Puck", name: "Puck (Casual Conversational Male)", desc: "Energetic, witty, spontaneous" },
    { id: "Charon", name: "Charon (Calm Authoritative Male)", desc: "Composed, analytical, steady" },
    { id: "Fenrir", name: "Fenrir (Resonant Dynamic Male)", desc: "Rich tone, high-clarity" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3 space-y-4 max-w-lg w-full mx-auto pb-24 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-base tracking-wide">Companion Settings</h2>
        </div>
        {isSaved && (
          <span className="flex items-center text-xs text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5 mr-1" />
            Saved
          </span>
        )}
      </div>

      {/* Profile & Name */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center">
          <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
          Personalization
        </h3>
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">Your Preferred Name</label>
          <input
            type="text"
            value={settings.userName}
            onChange={(e) => handleSave({ userName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Voice Selection */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center">
          <Volume2 className="w-4 h-4 mr-1.5 text-indigo-400" />
          Streaming AI Voice Engine
        </h3>
        <div className="space-y-2">
          {voices.map((v) => (
            <div
              key={v.id}
              onClick={() => handleSave({ voiceName: v.id })}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                settings.voiceName === v.id
                  ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200"
                  : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-zinc-100">{v.name}</p>
                <p className="text-[10px] text-zinc-500">{v.desc}</p>
              </div>
              {settings.voiceName === v.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>



      {/* Features & Privacy */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-purple-400" />
          Capabilities & Visual Mode
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs font-medium text-zinc-200">Google Search Grounding</p>
            <p className="text-[10px] text-zinc-500">Live web research for real-time questions</p>
          </div>
          <input
            type="checkbox"
            checked={settings.searchGrounding}
            onChange={(e) => handleSave({ searchGrounding: e.target.checked })}
            className="w-4 h-4 accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-zinc-800/60">
          <div>
            <p className="text-xs font-medium text-zinc-200">Auto Persistent Memory</p>
            <p className="text-[10px] text-zinc-500">Automatically remember user facts across sessions</p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoMemory}
            onChange={(e) => handleSave({ autoMemory: e.target.checked })}
            className="w-4 h-4 accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-zinc-800/60">
          <div>
            <p className="text-xs font-medium text-zinc-200">60-120 FPS High Refresh Visualizer</p>
            <p className="text-[10px] text-zinc-500">Cinematic GPU-accelerated canvas motion</p>
          </div>
          <input
            type="checkbox"
            checked={settings.highRefresh}
            onChange={(e) => handleSave({ highRefresh: e.target.checked })}
            className="w-4 h-4 accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
