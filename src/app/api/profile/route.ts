import { NextResponse } from "next/server";
import { getProfile } from "@/features/profile/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile();
  return NextResponse.json({ profile });
}
