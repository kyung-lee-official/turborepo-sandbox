import { spawn } from "node:child_process";

type ChildProcessLike = {
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "close", listener: (code: number | null) => void): void;
  stderr: {
    setEncoding(encoding: string): void;
    on(event: "data", listener: (chunk: string) => void): void;
  } | null;
};

const TIME_PATTERN = /time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/;

function parseHhMmSsToSeconds(match: RegExpMatchArray): number {
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

function runProcess(
  command: string,
  args: string[],
  onStderrChunk?: (chunk: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    }) as unknown as ChildProcessLike;

    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
      onStderrChunk?.(chunk);
    });

    child.on("error", (error: Error) => {
      reject(
        new Error(
          `Failed to start ${command}. Is it installed and on PATH? ${error.message}`,
        ),
      );
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }
      const tail = stderr.trim().slice(-1500);
      reject(
        new Error(
          `${command} exited with code ${code}${tail ? `:\n${tail}` : ""}`,
        ),
      );
    });
  });
}

export type FfmpegCfrProgress = {
  percent: number | null;
  detail: string;
};

export async function runFfmpegVfrToCfr(input: {
  inputPath: string;
  outputPath: string;
  fps: number;
  durationSeconds: number | null;
  onProgress: (progress: FfmpegCfrProgress) => void | Promise<void>;
}): Promise<void> {
  const args = [
    "-hide_banner",
    "-y",
    "-i",
    input.inputPath,
    "-fps_mode",
    "cfr",
    "-r",
    String(input.fps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    input.outputPath,
  ];

  let lastPercent: number | null = null;

  await runProcess("ffmpeg", args, (chunk) => {
    const match = TIME_PATTERN.exec(chunk);
    if (!match) {
      return;
    }

    const currentSeconds = parseHhMmSsToSeconds(match);
    const detail = `encoded ${match[1]}:${match[2]}:${match[3]} @ ${input.fps} fps`;
    let percent: number | null = null;

    if (input.durationSeconds != null && input.durationSeconds > 0) {
      percent = Math.min(
        99,
        Math.round((currentSeconds / input.durationSeconds) * 100),
      );
      if (percent === lastPercent) {
        return;
      }
      lastPercent = percent;
    }

    void input.onProgress({ percent, detail });
  });

  await input.onProgress({
    percent: 100,
    detail: `finished @ ${input.fps} fps CFR`,
  });
}
