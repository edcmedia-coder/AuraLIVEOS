// Utility functions for client-side audio processing, VAD, and 24kHz PCM playback

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return output.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = typeof window !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const dataView = new DataView(buffer);
  const numSamples = buffer.byteLength / 2;
  const float32 = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    float32[i] = int16 / (int16 < 0 ? 32768 : 32767);
  }
  return float32;
}

export function calculateAudioRMS(float32Data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < float32Data.length; i++) {
    sum += float32Data[i] * float32Data[i];
  }
  return Math.sqrt(sum / float32Data.length);
}

export class GaplessPCMPlayer {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private onAmplitudeCallback?: (amp: number) => void;
  private sampleRate: number;
  private volume: number = 0.85;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  public setOnAmplitude(cb: (amp: number) => void) {
    this.onAmplitudeCallback = cb;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: this.sampleRate });
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public playChunk(base64Pcm: string): number {
    this.initCtx();
    if (!this.audioCtx || !this.gainNode) return 0;

    const arrayBuffer = base64ToArrayBuffer(base64Pcm);
    const float32 = pcm16ToFloat32(arrayBuffer);
    if (float32.length === 0) return 0;

    // Report amplitude for visualizer
    const rms = calculateAudioRMS(float32);
    if (this.onAmplitudeCallback) {
      this.onAmplitudeCallback(rms);
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const currentTime = this.audioCtx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.activeSources.push(source);
    this.isPlaying = true;

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        if (this.onAmplitudeCallback) {
          this.onAmplitudeCallback(0);
        }
      }
    };

    return audioBuffer.duration;
  }

  // Sub-50ms Barge-In Instant Stop & Clear
  public stopAndClear(): void {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    this.isPlaying = false;
    if (this.onAmplitudeCallback) {
      this.onAmplitudeCallback(0);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying || this.activeSources.length > 0;
  }

  public close(): void {
    this.stopAndClear();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
