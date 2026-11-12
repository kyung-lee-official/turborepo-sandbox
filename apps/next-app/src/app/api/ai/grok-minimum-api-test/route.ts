import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_GROK_MODEL,
  GROK_TEST_PROMPT,
} from "@/app/ai/grok-minimum-api-test/constants";
import type { GrokMinimumApiTestResult } from "@/app/ai/grok-minimum-api-test/types";
import { createProxyFetch } from "@/lib/proxy-fetch";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  model: z.string().trim().min(1).default(DEFAULT_GROK_MODEL),
  proxyUrl: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { token, model, proxyUrl } = parsed.data;
  const startedAt = Date.now();

  try {
    const xai = createXai({
      apiKey: token,
      fetch: createProxyFetch(proxyUrl),
    });
    const result = await generateText({
      model: xai(model),
      prompt: GROK_TEST_PROMPT,
      maxRetries: 0,
    });

    const responseBody = {
      text: result.text,
      model,
      proxyUrl: proxyUrl || null,
      finishReason: result.finishReason,
      latencyMs: Date.now() - startedAt,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
    } satisfies GrokMinimumApiTestResult;

    return NextResponse.json(responseBody);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
