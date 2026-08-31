import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Modality } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "Zephyr" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required for TTS" }, { status: 400 });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say naturally and fluidly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return NextResponse.json({ error: "No audio generated from TTS model" }, { status: 500 });
    }

    return NextResponse.json({
      audio: base64Audio,
      sampleRate: 24000,
      mimeType: "audio/pcm",
    });
  } catch (err: any) {
    console.error("[TTS Error]", err);
    return NextResponse.json({ error: err?.message || "Failed to generate speech" }, { status: 500 });
  }
}
