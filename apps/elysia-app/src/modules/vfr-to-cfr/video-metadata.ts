import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type { VideoProbeInfo } from "./probe-video-info.ts";

export type UploadedVideoMetadataFields = {
  kind: "uploaded";
  id: string;
  originalName: string;
  sha256: string;
  sizeBytes: number;
  createdAt: string;
  probe: VideoProbeInfo;
};

export async function computeFileSha256Hex(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function formatResolution(probe: VideoProbeInfo): string {
  if (probe.width != null && probe.height != null) {
    return `${probe.width}x${probe.height}`;
  }
  return "unknown";
}

function formatFrameRateForDisplay(raw: string | null): string {
  if (!raw || raw === "0/0") {
    return "unknown";
  }
  if (raw.includes("/")) {
    const [numeratorText, denominatorText] = raw.split("/");
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return "unknown";
    }
    return `${raw} (${(numerator / denominator).toFixed(3)} fps)`;
  }
  const fps = Number(raw);
  if (!Number.isFinite(fps) || fps <= 0) {
    return "unknown";
  }
  return `${fps.toFixed(3)} fps`;
}

export function buildUploadedMetadataMarkdown(
  fields: UploadedVideoMetadataFields,
): string {
  const { probe } = fields;
  return `# Uploaded video \`${fields.id}\`

## Digest

- **SHA-256:** \`${fields.sha256}\`

## File

- **Original name:** ${fields.originalName}
- **Size bytes:** ${fields.sizeBytes}
- **Uploaded at:** ${fields.createdAt}

## Media (ffprobe)

- **Duration (s):** ${probe.durationSeconds ?? "unknown"}
- **Format:** ${probe.formatName ?? "unknown"}
- **Video codec:** ${probe.videoCodec ?? "unknown"}
- **Resolution:** ${formatResolution(probe)}
- **Average frame rate:** ${formatFrameRateForDisplay(probe.avgFrameRate)}
- **Audio codec:** ${probe.audioCodec ?? "none"}
- **Bit rate:** ${probe.bitRate ?? "unknown"}
`;
}

export async function writeMetadataMarkdown(
  metadataPath: string,
  markdown: string,
): Promise<void> {
  await writeFile(metadataPath, markdown, "utf8");
}

export async function readMetadataMarkdown(
  metadataPath: string,
): Promise<string> {
  return readFile(metadataPath, "utf8");
}

export function parseSha256FromMarkdown(markdown: string): string | null {
  const match = markdown.match(/\*\*SHA-256:\*\* `([a-f0-9]{64})`/);
  return match?.[1] ?? null;
}

export function parseOriginalNameFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/\*\*Original name:\*\* (.+)/);
  return match?.[1]?.trim() ?? null;
}

export function parseCreatedAtFromMarkdown(markdown: string): string | null {
  const uploaded = markdown.match(/\*\*Uploaded at:\*\* (.+)/);
  if (uploaded?.[1]) {
    return uploaded[1].trim();
  }
  const created = markdown.match(/\*\*Created at:\*\* (.+)/);
  return created?.[1]?.trim() ?? null;
}

export function parseDurationFromMarkdown(markdown: string): number | null {
  const match = markdown.match(/\*\*Duration \(s\):\*\* ([0-9.]+|unknown)/);
  if (!match?.[1] || match[1] === "unknown") {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseSizeBytesFromMarkdown(markdown: string): number | null {
  const match = markdown.match(/\*\*Size bytes:\*\* (\d+)/);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
