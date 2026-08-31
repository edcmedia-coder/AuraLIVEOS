import { NextRequest, NextResponse } from "next/server";
import { StorageEngine } from "@/lib/db/store";

export async function GET() {
  const settings = StorageEngine.getSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = StorageEngine.updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update settings" }, { status: 500 });
  }
}
