import { spawn } from "node:child_process";

type ChildProcessLike = {
  on(event: "error", listener: () => void): void;
  on(event: "close", listener: (code: number | null) => void): void;
  stdout: {
    setEncoding(encoding: string): void;
    on(event: "data", listener: (chunk: string) => void): void;
  } | null;
};

export type VideoProbeInfo = {
  durationSeconds: number | null;
  formatName: string | null;
  sizeBytes: number | null;
  bitRate: number | null;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  avgFrameRate: string | null;
  audioCodec: string | null;
};

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
};

type FfprobeFormat = {
  format_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
};

type FfprobeJson = {
  format?: FfprobeFormat;
  streams?: FfprobeStream[];
};

function readNumber(value: string | undefined): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFfprobeJson(raw: string): VideoProbeInfo {
  const empty: VideoProbeInfo = {
    durationSeconds: null,
    formatName: null,
    sizeBytes: null,
    bitRate: null,
    videoCodec: null,
    width: null,
    height: null,
    avgFrameRate: null,
    audioCodec: null,
  };

  try {
    const parsed = JSON.parse(raw) as FfprobeJson;
    const format = parsed.format;
    const videoStream = parsed.streams?.find((s) => s.codec_type === "video");
    const audioStream = parsed.streams?.find((s) => s.codec_type === "audio");

    return {
      durationSeconds: readNumber(format?.duration),
      formatName: format?.format_name ?? null,
      sizeBytes: readNumber(format?.size),
      bitRate: readNumber(format?.bit_rate),
      videoCodec: videoStream?.codec_name ?? null,
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      avgFrameRate: videoStream?.avg_frame_rate ?? null,
      audioCodec: audioStream?.codec_name ?? null,
    };
  } catch {
    return empty;
  }
}

export async function probeVideoInfo(
  filePath: string,
): Promise<VideoProbeInfo> {
  return new Promise((resolve) => {
    const child = spawn(
      "ffprobe",
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
      },
    ) as unknown as ChildProcessLike;

    let stdout = "";
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.on("error", () => {
      resolve(parseFfprobeJson(""));
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        resolve(parseFfprobeJson(""));
        return;
      }
      resolve(parseFfprobeJson(stdout));
    });
  });
}
