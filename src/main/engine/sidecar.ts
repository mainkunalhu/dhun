import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

export type RenderParams = {
  engine: string;
  modelPath: string;
  script: string;
  voiceId: string;
  voiceName: string;
  voicePrompt: string;
  language: string;
  speed: number;
  outputPath: string;
};

export type RenderResult = {
  wavPath: string;
  durationMs: number;
  sampleRate: number;
};

type Pending = {
  resolve: (value: RenderResult) => void;
  reject: (error: Error & { code?: string }) => void;
  onProgress?: (progress: number) => void;
};

/**
 * The Python engine, over newline-delimited JSON on stdio. One render at a
 * time; the process stays warm between jobs.
 */
export class Sidecar {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private stderr = '';

  constructor(
    private readonly python: string,
    private readonly script: string,
  ) {}

  private start(): void {
    if (this.child) return;

    const child = spawn(this.python, [this.script], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;

    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => this.onLine(line));

    child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString()}`.slice(-4000);
    });

    child.on('error', (error) => {
      this.child = null;
      this.failAll(error);
    });

    child.on('exit', () => {
      this.child = null;
      this.failAll(
        new Error(this.stderr.trim() || 'The voice engine stopped.'),
      );
    });
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private onLine(line: string): void {
    let message: {
      id?: number;
      type?: string;
      value?: unknown;
      error?: { code?: string; message?: string };
    };

    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;

    if (message.type === 'progress') {
      const value = message.value as { progress?: number } | undefined;
      pending.onProgress?.(Number(value?.progress ?? 0));
      return;
    }

    if (message.type === 'result') {
      this.pending.delete(message.id);
      pending.resolve(message.value as RenderResult);
      return;
    }

    if (message.type === 'error') {
      this.pending.delete(message.id);
      const error = new Error(
        message.error?.message ?? 'Render failed.',
      ) as Error & { code?: string };
      error.code = message.error?.code;
      pending.reject(error);
    }
  }

  render(
    params: RenderParams,
    onProgress?: (progress: number) => void,
  ): Promise<RenderResult> {
    this.start();
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.child?.stdin.write(
        `${JSON.stringify({ id, method: 'render', params })}\n`,
      );
    });
  }

  cancel(): void {
    this.child?.stdin.write(`${JSON.stringify({ method: 'cancel' })}\n`);
  }

  shutdown(): void {
    if (!this.child) return;
    const child = this.child;
    child.stdin.write(`${JSON.stringify({ method: 'shutdown' })}\n`);
    setTimeout(() => child.kill(), 2000).unref();
  }
}
