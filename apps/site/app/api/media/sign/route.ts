import { NextResponse } from "next/server";
import { signProtectedFiles } from "@/lib/actions/media-unlock";

export async function POST(req: Request) {
  let body: { fileIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ items: [] }, { status: 400 });
  }
  const fileIds = Array.isArray(body.fileIds)
    ? body.fileIds.filter((x): x is string => typeof x === "string")
    : [];
  const items = await signProtectedFiles(fileIds);
  return NextResponse.json({ items });
}
