import { NextRequest, NextResponse } from "next/server";
import { StorageEngine, Conversation, Message } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const messages = StorageEngine.getMessages(id);
    return NextResponse.json({ messages });
  }

  const conversations = StorageEngine.getConversations();
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, durationSeconds, transcripts, title } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    const convTitle = title || (transcripts?.[0]?.text ? transcripts[0].text.slice(0, 36) : "Live Session");

    const conv: Conversation = {
      id,
      title: convTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationSeconds: durationSeconds || 0,
      messageCount: transcripts?.length || 0,
      topics: ["Live Voice", "AURA Companion"],
    };

    StorageEngine.saveConversation(conv);

    if (transcripts && Array.isArray(transcripts)) {
      transcripts.forEach((t: any) => {
        if (t.text) {
          const msg: Message = {
            id: t.id || "m_" + Math.random().toString(36).substring(2, 7),
            conversationId: id,
            role: t.speaker === "ai" ? "assistant" : "user",
            text: t.text,
            timestamp: t.timestamp || new Date().toISOString(),
          };
          StorageEngine.addMessage(msg);
        }
      });
    }

    // Record usage telemetry
    StorageEngine.recordSessionStats(durationSeconds || 0, 160);

    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save history" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
  }

  StorageEngine.deleteConversation(id);
  return NextResponse.json({ success: true });
}
