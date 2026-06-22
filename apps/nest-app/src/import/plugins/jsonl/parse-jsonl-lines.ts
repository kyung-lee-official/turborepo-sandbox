import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import type {
  ErrorDetail,
  JsonlParseContext,
  ParseJsonlLinesHandlers,
} from "./jsonl-processing.types";
import { scopeJsonlError } from "./scope-jsonl-errors";

const UTF8_BOM = "\uFEFF";

function stripLeadingBom(line: string, isFirstLine: boolean): string {
  if (!isFirstLine) {
    return line;
  }
  return line.startsWith(UTF8_BOM) ? line.slice(UTF8_BOM.length) : line;
}

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimTopLevelStrings(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    trimmed[key] = typeof value === "string" ? value.trim() : value;
  }
  return trimmed;
}

function pushParseError(
  handlers: ParseJsonlLinesHandlers,
  scope: { sourceId: string; originalName?: string },
  detail: Pick<ErrorDetail, "message" | "rowNumber" | "rawData">,
): void {
  handlers.pushError(scopeJsonlError(detail, scope));
}

export async function parseJsonlLines(
  stream: Readable,
  ctx: JsonlParseContext,
  handlers: ParseJsonlLinesHandlers,
): Promise<void> {
  const scope = {
    sourceId: ctx.sourceId,
    originalName: ctx.label,
  };

  let rowNumber = 0;
  let processedNonBlankLines = 0;
  const lineReader = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const rawLine of lineReader) {
    rowNumber++;
    const line = stripLeadingBom(rawLine, rowNumber === 1);
    if (isBlankLine(line)) {
      continue;
    }

    const rawData = line.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      pushParseError(handlers, scope, {
        message: "Invalid JSON on line",
        rowNumber,
        rawData,
      });
      processedNonBlankLines++;
      continue;
    }

    if (!isPlainObject(parsed)) {
      pushParseError(handlers, scope, {
        message: "Line must be a JSON object",
        rowNumber,
        rawData,
      });
      processedNonBlankLines++;
      continue;
    }

    const record = trimTopLevelStrings(parsed);
    await handlers.onLine({ rowNumber, record });
    processedNonBlankLines++;
  }

  if (handlers.onProgress && processedNonBlankLines > 0) {
    await handlers.onProgress(100);
  }
}
