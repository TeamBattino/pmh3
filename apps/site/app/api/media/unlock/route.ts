import { NextResponse } from "next/server";
import { unlockMedia } from "@/lib/actions/media-unlock";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  const result = await unlockMedia(password);
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
