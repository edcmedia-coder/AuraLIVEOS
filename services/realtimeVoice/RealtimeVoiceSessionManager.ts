import { floatTo16BitPCM, arrayBufferToBase64, GaplessPCMPlayer, calculateAudioRMS } from "../../lib/audio-utils";
import { LatencyMonitor } from "./LatencyMonitor";

export type SessionState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "LISTENING"
  | "USER_SPEAKING"
  | "PROCESSING"
  | "AI_SPEAKING"
  | "INTERRUPTED"
  | "ERROR"
  | "ENDING";

export interface TranscriptItem {
  id: string;
  speaker: "user" | "ai";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface SessionCallbacks {
  onStateChange?: (state: SessionState) => void;
  onUserVolume?: (volume: number) => void;
  onAiVolume?: (volume: number) => void;
  onTranscriptUpdate?: (transcripts: TranscriptItem[]) => void;
  onError?: (msg: string) => void;
  onLatencyUpdate?: (bargeInMs: number, firstAudioMs: number) => void;
}

export class RealtimeVoiceSessionManager {
  private state: SessionState = "IDLE";
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private pcmPlayer: GaplessPCMPlayer;
  private latencyMonitor: LatencyMonitor;

  private callbacks: SessionCallbacks = {};
  private transcripts: TranscriptItem[] = [];
  private currentAiTranscript = "";
  private currentUserTranscript = "";

  private vadSensitivity = 0.55; // default RMS threshold
  private isMuted = false;
  private voiceName = "Zephyr";
  private sessionStartTime = 0;
  private conversationId = "";

  // VAD state for debouncing
  private consecutiveSpeechFrames = 0;
  private consecutiveSilenceFrames = 0;
  private readonly SPEECH_THRESHOLD_FRAMES = 2; // ~500ms total with 4096 buffer at 16k is ~256ms per buffer. 2 frames = 512ms
  private readonly SILENCE_THRESHOLD_FRAMES = 3;

  constructor() {
    this.pcmPlayer = new GaplessPCMPlayer(24000);
    this.latencyMonitor = new LatencyMonitor();

    this.pcmPlayer.setOnAmplitude((amp) => {
      if (this.callbacks.onAiVolume) {
        this.callbacks.onAiVolume(amp);
      }
      if (amp > 0.05 && this.state !== "AI_SPEAKING" && this.state !== "INTERRUPTED") {
        this.setState("AI_SPEAKING");
      }
    });
  }

  public setCallbacks(cb: SessionCallbacks) {
    this.callbacks = cb;
  }

  public setVoiceName(voice: string) {
    this.voiceName = voice;
  }

  public setVadSensitivity(sensitivity: number) {
    this.vadSensitivity = sensitivity;
  }

  public setVolume(vol: number) {
    this.pcmPlayer.setVolume(vol);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getState(): SessionState {
    return this.state;
  }

  public getTranscripts(): TranscriptItem[] {
    return this.transcripts;
  }

  private processingTimer: any = null;

  private setState(newState: SessionState) {
    if (this.state === newState) return;
    this.state = newState;

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    if (newState === "PROCESSING") {
      this.processingTimer = setTimeout(() => {
        if (this.state === "PROCESSING") {
          console.warn("[Session] Processing timeout fallback to LISTENING");
          this.setState("LISTENING");
        }
      }, 6000);
    }

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }
  }

  // Start Full-Duplex Voice Session
  public async startSession(customVoice?: string): Promise<boolean> {
    if (this.state !== "IDLE" && this.state !== "ERROR") {
      return false;
    }

    this.setState("CONNECTING");
    this.conversationId = "conv_" + Date.now();
    this.sessionStartTime = Date.now();
    this.transcripts = [];
    this.currentAiTranscript = "";
    this.currentUserTranscript = "";

    const activeVoice = customVoice || this.voiceName;

    try {
      // 1. Initialize Microphone Audio Stream (16kHz PCM)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // 4096 buffer size = ~256ms audio frame chunk
      this.scriptNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(this.scriptNode);
      this.scriptNode.connect(this.inputAudioCtx.destination);

      // 2. Connect WebSocket to Server Proxy
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws?voice=${encodeURIComponent(
        activeVoice
      )}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setState("CONNECTED");
        setTimeout(() => {
          if (this.state === "CONNECTED") {
            this.setState("LISTENING");
          }
        }, 300);
      };

      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.ws.onerror = (err) => {
        console.error("[Session WS Error]", err);
        if (this.callbacks.onError) {
          this.callbacks.onError("WebSocket connection degraded or server unavailable.");
        }
        this.setState("ERROR");
      };

      this.ws.onclose = () => {
        if (this.state !== "ENDING" && this.state !== "IDLE") {
          this.setState("IDLE");
        }
      };

      // 3. Audio Capture Loop + VAD Engine
      this.scriptNode.onaudioprocess = (e) => {
        if (this.isMuted || this.state === "IDLE" || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const rms = calculateAudioRMS(inputData);

        if (this.callbacks.onUserVolume) {
          this.callbacks.onUserVolume(rms);
        }

        // Slightly higher threshold to avoid background noise
        const threshold = Math.max(0.015, 0.1 - this.vadSensitivity * 0.08);

        // VAD & Barge-in Trigger with Debouncing
        if (rms > threshold) {
          this.consecutiveSpeechFrames++;
          this.consecutiveSilenceFrames = 0;

          // Only trigger state change if we have enough consecutive frames or it's a very loud sound
          if (this.consecutiveSpeechFrames >= this.SPEECH_THRESHOLD_FRAMES || rms > threshold * 3) {
            // TRUE BARGE-IN CHECK: User spoke while AI was speaking!
            if (this.state === "AI_SPEAKING" || this.pcmPlayer.getIsPlaying()) {
              this.latencyMonitor.markBargeInStart();
              this.pcmPlayer.stopAndClear(); // Sub-50ms instant audio playback cancellation!
              const bargeInMs = this.latencyMonitor.markBargeInCleared();

              this.setState("INTERRUPTED");

              // Send cancel signal to model
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "cancel" }));
              }

              if (this.callbacks.onLatencyUpdate) {
                this.callbacks.onLatencyUpdate(bargeInMs, this.latencyMonitor.getAverageFirstAudioLatency());
              }

              setTimeout(() => {
                this.setState("USER_SPEAKING");
              }, 80);
            } else if (this.state === "LISTENING" || this.state === "PROCESSING") {
              this.setState("USER_SPEAKING");
              this.latencyMonitor.markUserSpeechStart();
            }
          }
        } else {
          this.consecutiveSilenceFrames++;
          this.consecutiveSpeechFrames = 0;

          if (this.state === "USER_SPEAKING" && this.consecutiveSilenceFrames >= this.SILENCE_THRESHOLD_FRAMES) {
            this.latencyMonitor.markUserSpeechEnd();
            this.setState("PROCESSING");
          }
        }

        // Always stream audio when not purely listening to AI without barge-in
        // We use a lower threshold for streaming once speech has started (hysteresis)
        const streamingThreshold = this.state === "USER_SPEAKING" ? threshold * 0.4 : threshold;
        if (this.state !== "AI_SPEAKING" || rms > streamingThreshold) {
          const pcmBuffer = floatTo16BitPCM(inputData);
          const base64Pcm = arrayBufferToBase64(pcmBuffer);

          this.ws.send(
            JSON.stringify({
              type: "audio",
              audio: base64Pcm,
            })
          );
        }
      };

      return true;
    } catch (err: any) {
      console.error("[Session Start Error]", err);
      this.setState("ERROR");
      if (this.callbacks.onError) {
        let msg = err.message || "Could not access microphone or server.";
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          msg.toLowerCase().includes("permission denied")
        ) {
          msg = "Microphone Permission Denied. Please allow microphone access in your browser/iframe permissions or open the app in a new tab.";
        }
        this.callbacks.onError(msg);
      }
      return false;
    }
  }

  // Handle incoming server message from Gemini Live WebSocket proxy
  private handleServerMessage(dataStr: string) {
    try {
      const msg = JSON.parse(dataStr);

      if (msg.type === "audio" && msg.audio) {
        if (this.state === "PROCESSING" || this.state === "USER_SPEAKING" || this.state === "CONNECTED") {
          this.setState("AI_SPEAKING");
          const firstAudioMs = this.latencyMonitor.markFirstAudioChunk();
          if (this.callbacks.onLatencyUpdate) {
            this.callbacks.onLatencyUpdate(this.latencyMonitor.getAverageBargeInLatency(), firstAudioMs);
          }
        }
        this.pcmPlayer.playChunk(msg.audio);
      } else if (msg.type === "output_transcript" && msg.text) {
        this.currentAiTranscript += msg.text;
        this.updateTranscript("ai", this.currentAiTranscript, true);
      } else if (msg.type === "input_transcript" && msg.text) {
        this.currentUserTranscript = msg.text;
        this.updateTranscript("user", this.currentUserTranscript, true);
      } else if (msg.type === "interrupted") {
        this.pcmPlayer.stopAndClear();
        this.setState("INTERRUPTED");
      } else if (msg.type === "turn_complete") {
        if (this.currentAiTranscript) {
          this.updateTranscript("ai", this.currentAiTranscript, false);
          this.currentAiTranscript = "";
        }
        if (this.currentUserTranscript) {
          this.updateTranscript("user", this.currentUserTranscript, false);
          this.currentUserTranscript = "";
        }
        // Rapid transition back to LISTENING for zero-latency feel
        if (this.state === "AI_SPEAKING" || this.state === "PROCESSING") {
          this.setState("LISTENING");
        }
      } else if (msg.type === "error") {
        console.warn("[Session Proxy Warning]", msg.message);
        if (this.callbacks.onError) {
          this.callbacks.onError(msg.message);
        }
      }
    } catch (e) {
      console.error("[Parse Server Message Fail]", e);
    }
  }

  private updateTranscript(speaker: "user" | "ai", text: string, isStreaming: boolean) {
    const existingIdx = this.transcripts.findIndex(
      (t) => t.speaker === speaker && t.isStreaming
    );

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (existingIdx !== -1) {
      this.transcripts[existingIdx] = {
        ...this.transcripts[existingIdx],
        text,
        isStreaming,
      };
    } else {
      this.transcripts.push({
        id: "t_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        speaker,
        text,
        timestamp: now,
        isStreaming,
      });
    }

    if (this.callbacks.onTranscriptUpdate) {
      this.callbacks.onTranscriptUpdate([...this.transcripts]);
    }
  }

  // Send textual input mid-session
  public sendTextPrompt(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.updateTranscript("user", text, false);
      this.setState("PROCESSING");
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  // Send camera/image frame mid-session
  public sendImageFrame(base64Image: string, mimeType = "image/jpeg") {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "image", image: base64Image, mimeType }));
    }
  }

  // End Session cleanly
  public async endSession(): Promise<void> {
    this.setState("ENDING");

    // Stop mic
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Stop playback
    this.pcmPlayer.stopAndClear();

    // Close WS
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Record telemetry & store conversation
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 1000));
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.conversationId,
          durationSeconds,
          transcripts: this.transcripts,
          title: this.transcripts[0]?.text.slice(0, 36) || "AURA Live Conversation",
        }),
      });
    } catch {
      // ignore offline error
    }

    this.setState("IDLE");
  }
}
