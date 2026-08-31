"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Navigation, NavTab } from "@/components/Navigation";
import { RealisticAvatar } from "@/components/LiveCompanion/RealisticAvatar";
import { AudioVisualizer } from "@/components/LiveCompanion/AudioVisualizer";
import { LiveTranscript } from "@/components/LiveCompanion/LiveTranscript";
import { VoiceControls } from "@/components/LiveCompanion/VoiceControls";
import { CameraViewModal } from "@/components/LiveCompanion/CameraViewModal";
import { DocumentShareModal } from "@/components/LiveCompanion/DocumentShareModal";
import { HistoryView } from "@/components/History/HistoryView";
import { MemoryView } from "@/components/Memory/MemoryView";
import { KnowledgeView } from "@/components/Knowledge/KnowledgeView";
import { SettingsView } from "@/components/Settings/SettingsView";
import { AnalyticsView } from "@/components/Analytics/AnalyticsView";

import {
  RealtimeVoiceSessionManager,
  SessionState,
  TranscriptItem,
} from "@/services/realtimeVoice/RealtimeVoiceSessionManager";
import { UserSettings } from "@/lib/db/store";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Home, Mic, Layers, Compass, User, Brain, Activity, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>("live");
  const [sessionState, setSessionState] = useState<SessionState>("IDLE");
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [bargeInLatencyMs, setBargeInLatencyMs] = useState(165);
  const [firstAudioLatencyMs, setFirstAudioLatencyMs] = useState(380);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);

  const [settings, setSettings] = useState<UserSettings>({
    userName: "Corey",
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

  const voiceManagerRef = useRef<RealtimeVoiceSessionManager | null>(null);

  useEffect(() => {
    const manager = new RealtimeVoiceSessionManager();
    voiceManagerRef.current = manager;

    manager.setCallbacks({
      onStateChange: (state) => setSessionState(state),
      onUserVolume: (vol) => setUserVolume(vol),
      onAiVolume: (vol) => setAiVolume(vol),
      onTranscriptUpdate: (list) => setTranscripts(list),
      onLatencyUpdate: (bargeInMs, firstAudioMs) => {
        if (bargeInMs > 0) setBargeInLatencyMs(bargeInMs);
        if (firstAudioMs > 0) setFirstAudioLatencyMs(firstAudioMs);
      },
      onError: (msg) => setErrorMessage(msg),
    });

    return () => {
      manager.endSession();
    };
  }, []);

  const handleToggleSession = async () => {
    if (!voiceManagerRef.current) return;
    setErrorMessage(null);

    if (sessionState === "IDLE" || sessionState === "ERROR") {
      const success = await voiceManagerRef.current.startSession(settings.voiceName);
      if (!success && !errorMessage) {
        setErrorMessage("Unable to access microphone.");
      }
    } else {
      await voiceManagerRef.current.endSession();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (voiceManagerRef.current) voiceManagerRef.current.setMuted(nextMuted);
  };

  const handleManualInterrupt = () => {
    if (voiceManagerRef.current) setUserVolume(0.8);
  };

  const handleCaptureCameraFrame = (base64Img: string, isAuto?: boolean) => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.sendImageFrame(base64Img);
      if (!isAuto) {
        voiceManagerRef.current.sendTextPrompt("What am I looking at in this camera view?");
        setIsCameraOpen(false);
      }
    }
  };

  const handleSettingsUpdated = (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setVoiceName(newSettings.voiceName);
      voiceManagerRef.current.setVadSensitivity(newSettings.vadSensitivity);
      voiceManagerRef.current.setVolume(newSettings.aiVolume);
    }
  };

  const isLiveActive = sessionState !== "IDLE" && sessionState !== "ERROR";

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-black text-white font-sans antialiased select-none overflow-hidden relative">
      {/* Background Layer: Avatar stays as background for Live tab */}
      {activeTab === "live" && (
        <div className="absolute inset-0 z-0">
          <RealisticAvatar
            sessionState={sessionState}
            userVolume={userVolume}
            aiVolume={aiVolume}
          />
        </div>
      )}

      {/* Header Bar */}
      <Header
        sessionState={sessionState}
        bargeInLatencyMs={bargeInLatencyMs}
        firstAudioLatencyMs={firstAudioLatencyMs}
        voiceName={settings.voiceName}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full h-full z-10 pb-[84px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Error Notification Bar */}
            {errorMessage && (
              <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-xs text-red-200 shadow-2xl backdrop-blur-3xl">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="font-bold">{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)}>
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tab 1: LIVE */}
            {activeTab === "live" && (
              <div className="flex-1 w-full h-full relative pointer-events-none">
                {/* Right Side Info Panel */}
                <div className="absolute top-20 right-4 flex flex-col space-y-3 w-[84px] z-20 pointer-events-auto">
                  <StatusCard label="LISTENING" isActive={sessionState === "USER_SPEAKING" || sessionState === "LISTENING"}>
                    <AudioVisualizer
                      userVolume={userVolume}
                      aiVolume={0}
                      sessionState="USER_SPEAKING"
                      mini
                    />
                  </StatusCard>
                  <StatusCard label="THINKING" isActive={sessionState === "PROCESSING"}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-[7px] text-zinc-400 font-bold mb-1 tracking-wider uppercase">Analyzing...</span>
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                  </StatusCard>
                  <StatusCard label="SPEAKING" isActive={sessionState === "AI_SPEAKING"}>
                    <AudioVisualizer
                      userVolume={0}
                      aiVolume={aiVolume}
                      sessionState="AI_SPEAKING"
                      mini
                    />
                  </StatusCard>
                </div>

                {/* Bottom Center Content */}
                <div className="absolute bottom-[100px] left-0 right-0 flex flex-col items-center w-full px-4 z-20 pointer-events-auto">
                  {/* Chat Bubble */}
                  <div className="w-full max-w-[360px] mb-8">
                    <LiveTranscript 
                      transcripts={transcripts} 
                      userName={settings.userName}
                    />
                  </div>

                  {/* Main Controls */}
                  <div className="w-full max-w-[360px]">
                    <VoiceControls
                      sessionState={sessionState}
                      isMuted={isMuted}
                      onToggleSession={handleToggleSession}
                      onToggleMute={handleToggleMute}
                      onOpenCamera={() => setIsCameraOpen(true)}
                      onOpenDocument={() => setIsDocumentOpen(true)}
                      onManualInterrupt={handleManualInterrupt}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && <div className="p-4"><HistoryView /></div>}
            {activeTab === "knowledge" && <div className="p-4"><KnowledgeView /></div>}
            {activeTab === "settings" && <div className="p-4"><SettingsView onSettingsUpdated={handleSettingsUpdated} /></div>}
            {activeTab === "home" && (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                 <h1 className="text-4xl font-black italic tracking-tighter mb-4 text-primary">EDC LIVE</h1>
                 <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-xs">Your AI Agent. Your Command. Your Advantage.</p>
                 <button onClick={() => setActiveTab("live")} className="mt-8 px-8 py-4 bg-primary/10 border border-primary/30 rounded-2xl text-primary font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                   Enter Command Center
                 </button>
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Camera Vision Modal */}
      <CameraViewModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCaptureFrame={handleCaptureCameraFrame} />
      <DocumentShareModal isOpen={isDocumentOpen} onClose={() => setIsDocumentOpen(false)} onDocumentAdded={() => {}} />

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} isLiveActive={isLiveActive} />
    </div>
  );
}

function StatusCard({ label, children, isActive }: { label: string; children: React.ReactNode; isActive: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-[20px] border transition-all duration-500 bg-black/50 backdrop-blur-2xl h-[84px] ${isActive ? "border-primary shadow-[0_0_15px_rgba(0,229,255,0.3)]" : "border-white/10"}`}>
      <span className="text-[8px] font-bold tracking-[0.1em] mb-1.5 uppercase text-zinc-300">{label}</span>
      <div className="flex-1 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
