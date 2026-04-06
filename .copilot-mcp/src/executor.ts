import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
}

export function executeCommand(
  command: string,
  args: string[],
  cwd: string,
  timeout: number,
  maxOutputSize: number,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let truncated = false;
    let timedOut = false;
    let killed = false;

    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let closed = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!closed) {
          child.kill("SIGKILL");
        }
      }, 3000);
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stdout.length + chunk.length > maxOutputSize) {
        stdout += chunk.slice(0, maxOutputSize - stdout.length);
        truncated = true;
        if (!killed) {
          killed = true;
          child.kill("SIGTERM");
        }
      } else {
        stdout += chunk;
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stderr.length + chunk.length > maxOutputSize) {
        stderr += chunk.slice(0, maxOutputSize - stderr.length);
        truncated = true;
      } else {
        stderr += chunk;
      }
    });

    child.on("close", (code) => {
      closed = true;
      clearTimeout(timer);
      if (truncated) {
        stdout += "\n[出力が上限を超えたため切り詰めました]";
      }
      if (timedOut) {
        stderr += "\n[タイムアウトによりプロセスを終了しました]";
      }
      resolve({
        exitCode: code,
        stdout,
        stderr,
        truncated,
        timedOut,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        stdout,
        stderr: err.message,
        truncated: false,
        timedOut: false,
      });
    });
  });
}
