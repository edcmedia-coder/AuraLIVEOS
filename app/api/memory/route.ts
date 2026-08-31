import { NextRequest, NextResponse } from "next/server";
import { StorageEngine } from "@/lib/db/store";

export async function GET() {
  const memories = StorageEngine.getMemories();
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, fact, category } = body;

    if (!key || !fact) {
      return NextResponse.json({ error: "key and fact are required" }, { status: 400 });
    }

    const item = StorageEngine.addMemory({
      key,
      fact,
      category: category || "fact",
    });

    return NextResponse.json({ success: true, memory: item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save memory" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("clearAll");

  if (clearAll === "true") {
    StorageEngine.clearAllMemories();
    return NextResponse.json({ success: true, cleared: true });
  }

  if (!id) {
    return NextResponse.json({ error: "Missing memory ID" }, { status: 400 });
  }

  StorageEngine.deleteMemory(id);
  return NextResponse.json({ success: true });
}
