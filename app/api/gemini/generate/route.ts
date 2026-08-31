import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { StorageEngine } from "@/lib/db/store";
import { KnowledgeEngine } from "@/lib/knowledge/engine";
import { ALL_TOOL_DECLARATIONS, executeToolCall } from "@/lib/tools";

export async function POST(req: NextRequest) {
  try {
    const { prompt, history, enableSearch = true } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const ai = getGeminiClient();
    const settings = StorageEngine.getSettings();
    const memories = StorageEngine.getMemories();

    // Context Assembly
    const memoryContext = memories.length > 0
      ? "User Persistent Memories:\n" + memories.map((m) => `- [${m.key}]: ${m.fact}`).join("\n")
      : "";

    const knowledgeMatches = KnowledgeEngine.searchKnowledge(prompt, 3);
    const knowledgeContext = knowledgeMatches.length > 0
      ? "Relevant Knowledge Documents:\n" + knowledgeMatches.map((k) => `- Source (${k.docTitle}): ${k.text}`).join("\n")
      : "";

    const systemInstruction = `You are AURA, an extraordinarily intelligent, warm, human-like live conversational companion.
${settings.personality}
User Name: ${settings.userName || "User"}

${memoryContext}

${knowledgeContext}

CONVERSATIONAL RULES:
1. Speak naturally with human cadence, warmth, and intelligence.
2. Keep spoken/conversational answers direct and concise (1-3 sentences) unless requested otherwise.
3. Utilize tool calling or search grounding when asked for current events, calculations, or knowledge lookup.
4. If the user mentions a fact worth remembering, mention that you'll remember it.`;

    const toolsConfig: any[] = [];
    if (enableSearch) {
      toolsConfig.push({ googleSearch: {} });
    }
    toolsConfig.push({ functionDeclarations: ALL_TOOL_DECLARATIONS });

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        tools: toolsConfig,
        toolConfig: { includeServerSideToolInvocations: true },
      },
    });

    // Check for Function Calls
    let finalAnswer = response.text || "";
    const functionCalls = response.functionCalls;
    let toolResultData: any = null;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      toolResultData = await executeToolCall(call.name || "", call.args);

      // Second turn with tool result
      const previousContent = response.candidates?.[0]?.content;
      const secondTurnRes = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          ...contents,
          previousContent,
          {
            role: "user",
            parts: [
              {
                text: `Tool Result for ${call.name}: ${JSON.stringify(toolResultData)}`,
              },
            ],
          },
        ],
        config: { systemInstruction },
      });

      finalAnswer = secondTurnRes.text || finalAnswer;
    }

    // Extract Grounding Chunks
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
      ? groundingChunks
          .map((chunk: any) => chunk.web)
          .filter(Boolean)
          .map((w: any) => ({ title: w.title || w.uri, uri: w.uri }))
      : [];

    return NextResponse.json({
      text: finalAnswer,
      sources,
      toolExecuted: toolResultData ? true : false,
      toolData: toolResultData,
    });
  } catch (err: any) {
    console.error("[Gemini Generate Route Error]", err);
    return NextResponse.json({ error: err?.message || "Failed to generate AI response" }, { status: 500 });
  }
}
