import { type NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/fetcher";

export async function GET(request: NextRequest) {
  const data = await get("/restaurants", {
    baseURL: "http://localhost:3101",
    headers: {
      "x-publishable-api-key":
        request.headers.get("x-publishable-api-key") || "",
    },
  });
  return NextResponse.json(data);
}
