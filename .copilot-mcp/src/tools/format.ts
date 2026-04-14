import type { CommandResult } from "../executor.js";

export interface CompileError {
  file?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  message: string;
}

export interface TestSummary {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
}

export interface BuildResult {
  success: boolean;
  exitCode: number | null;
  truncated: boolean;
  timedOut: boolean;
  errors: CompileError[];
  testSummary?: TestSummary;
  rawOutput: string;
}

export function formatResult(
  result: CommandResult,
): { content: { type: "text"; text: string }[]; isError?: boolean } {
  const parts: string[] = [];

  if (result.timedOut) parts.push("[タイムアウトによりプロセスを終了しました]");
  if (result.truncated) parts.push("[出力が上限を超えたため切り詰めました]");

  if (result.exitCode !== 0) {
    if (result.stderr) parts.push(`[stderr] ${result.stderr}`);
    if (result.stdout) parts.push(result.stdout);
    const text = parts.length > 0 ? parts.join("\n") : "(出力なし)";
    return { content: [{ type: "text" as const, text }], isError: true };
  }

  if (result.stdout) parts.push(result.stdout);
  const text = parts.length > 0 ? parts.join("\n") : "(出力なし)";
  return { content: [{ type: "text" as const, text }] };
}

export function formatBuildResult(
  result: CommandResult,
  errors: CompileError[],
  testSummary?: TestSummary,
): { content: { type: "text"; text: string }[]; isError?: boolean } {
  const rawParts: string[] = [];
  if (result.stdout) rawParts.push(result.stdout);
  if (result.stderr) rawParts.push(result.stderr);

  const buildResult: BuildResult = {
    success: result.exitCode === 0,
    exitCode: result.exitCode,
    truncated: result.truncated,
    timedOut: result.timedOut,
    errors,
    testSummary,
    rawOutput: rawParts.join("\n"),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(buildResult, null, 2) }],
    isError: result.exitCode !== 0 ? true : undefined,
  };
}
