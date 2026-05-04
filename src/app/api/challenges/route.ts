import { NextResponse } from "next/server";
import { getAllChallengeMeta } from "@/lib/challenges/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ challenges: getAllChallengeMeta() });
}
