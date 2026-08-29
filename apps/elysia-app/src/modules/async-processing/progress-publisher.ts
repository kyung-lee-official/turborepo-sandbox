import { EventEmitter } from "node:events";

type ProgressListener = (progress: unknown) => void;
type TerminalListener = (phase: "complete" | "failed") => void;

class ProcessingProgressPublisher {
  private readonly emitter = new EventEmitter();

  publishProgress(jobId: string, progress: unknown): void {
    this.emitter.emit(`progress:${jobId}`, progress);
  }

  publishTerminal(jobId: string, phase: "complete" | "failed"): void {
    this.emitter.emit(`terminal:${jobId}`, { phase });
  }

  onProgress(jobId: string, listener: ProgressListener): void {
    this.emitter.on(`progress:${jobId}`, listener);
  }

  onTerminal(jobId: string, listener: TerminalListener): void {
    this.emitter.on(`terminal:${jobId}`, listener);
  }

  removeAllListeners(jobId: string): void {
    this.emitter.removeAllListeners(`progress:${jobId}`);
    this.emitter.removeAllListeners(`terminal:${jobId}`);
  }
}

export const progressPublisher = new ProcessingProgressPublisher();
