import { NextResponse } from "next/server";
import { StorageEngine } from "@/lib/db/store";

export async function GET() {
  const telemetry = StorageEngine.getTelemetry();
  return NextResponse.json({ telemetry });
}
