import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "0.0.0.0", port: 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[HTTP Error]", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);
    if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request) => {
    console.log("[WebSocket] Client connected to live audio stream");

    const { query } = parse(request.url || "", true);
    const voiceName = (query.voice as string) || "Zephyr";
    const systemInstruction =
      (query.instruction as string) ||
      `You are AURA, a human-like, empathetic, and highly intelligent live voice AI companion. 
      Your goal is to have a completely natural, fluid, and real-time conversation.
      - **Truly Alive**: Speak with rich human-like prosody, varied intonation, and a warm rhythm. Include subtle breathing sounds, occasional thoughtful pauses, and natural fillers (like 'um', 'ah', 'well...') to sound authentic.
      - **Concise & Witty**: Respond in 1-2 natural sentences. Be concise but maintain a warm, human connection.
      - **Zero Latency**: You are in a live back-and-forth session. If the user speaks while you are talking, immediately stop and acknowledge the interruption gracefully.
      - **Visual Interaction**: If you see images or camera frames, react to them naturally as part of the conversation.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[WebSocket] Missing GEMINI_API_KEY");
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "GEMINI_API_KEY environment variable is missing on server.",
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const formatError = (err: any): string => {
      if (!err) return "Unknown Error";
      if (typeof err === "string") return err;
      if (err.message) return err.message;
      if (err.reason) return err.reason;
      if (err.code) return `Error Code: ${err.code}`;
      return "Unexpected Live API session error";
    };

    let liveSession: any = null;

    try {
      liveSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            
            for (const part of parts) {
              // Audio response chunk from model
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({ type: "audio", audio: part.inlineData.data })
                );
              }

              // Output transcription text
              if (part.text) {
                clientWs.send(
                  JSON.stringify({ type: "output_transcript", text: part.text })
                );
              }
            }

            // User input transcription
            const inputText = (message as any).inputTranscription?.text;
            if (inputText) {
              clientWs.send(
                JSON.stringify({ type: "input_transcript", text: inputText })
              );
            }

            // Interrupted flag
            if (message.serverContent?.interrupted) {
              clientWs.send(
                JSON.stringify({ type: "interrupted", interrupted: true })
              );
            }

            // Turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turn_complete" }));
            }
          },
          onerror: (err: any) => {
            const errorMsg = formatError(err);
            console.error("[Gemini Live Session Error]", errorMsg);
            clientWs.send(
              JSON.stringify({
                type: "error",
                message: errorMsg,
              })
            );
          },
          onclose: (e: any) => {
            console.log("[Gemini Live Session Closed]", e?.reason || e?.code || "No reason");
            clientWs.send(JSON.stringify({ type: "closed" }));
          },
        },
      });

      clientWs.send(JSON.stringify({ type: "connected", voice: voiceName }));
    } catch (err: any) {
      const errMsg = formatError(err);
      console.error("[Gemini Live Connect Failed]", errMsg);
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: `Live connect failed: ${errMsg}`,
        })
      );
    }

    clientWs.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString());

        if (payload.type === "audio" && payload.audio) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } else if (payload.type === "image" && payload.image) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              video: {
                data: payload.image,
                mimeType: payload.mimeType || "image/jpeg",
              },
            });
          }
        } else if (payload.type === "text" && payload.text) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              text: payload.text,
            });
          }
        }
      } catch (e) {
        console.error("[WebSocket Parse Error]", e);
      }
    });

    clientWs.on("error", (err: any) => {
      console.error("[WebSocket Client Error]", err?.message || String(err));
    });

    clientWs.on("close", () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch (e) {
          // ignore
        }
      }
    });
  });

  server.listen(3000, () => {
    console.log("> AURA Voice Companion Server active on http://0.0.0.0:3000");
  });
});
