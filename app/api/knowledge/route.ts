import { NextRequest, NextResponse } from "next/server";
import { StorageEngine } from "@/lib/db/store";
import { KnowledgeEngine } from "@/lib/knowledge/engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (query) {
    const matches = KnowledgeEngine.searchKnowledge(query, 5);
    return NextResponse.json({ query, matches });
  }

  const knowledge = StorageEngine.getKnowledge();
  return NextResponse.json({ knowledge });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, filename, fileType, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const doc = KnowledgeEngine.ingestDocument(
      title,
      filename || title + ".txt",
      fileType || "text/plain",
      content
    );

    return NextResponse.json({ success: true, doc });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to ingest document" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
  }

  StorageEngine.deleteKnowledge(id);
  return NextResponse.json({ success: true });
}
