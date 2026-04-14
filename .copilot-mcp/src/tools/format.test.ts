import { describe, it, expect } from "vitest";
import { formatBuildResult } from "./format.js";
import type { BuildResult, CompileError } from "./format.js";
import type { CommandResult } from "../executor.js";

function makeCommandResult(partial: Partial<CommandResult> = {}): CommandResult {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    truncated: false,
    timedOut: false,
    ...partial,
  };
}

function parseBuildResult(response: { content: { type: "text"; text: string }[] }): BuildResult {
  return JSON.parse(response.content[0].text);
}

describe("formatBuildResult", () => {
  it("成功時はsuccess=trueでisErrorがundefined", () => {
    const result = formatBuildResult(makeCommandResult({ exitCode: 0, stdout: "BUILD SUCCESS" }), []);
    expect(result.isError).toBeUndefined();
    const parsed = parseBuildResult(result);
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.rawOutput).toBe("BUILD SUCCESS");
  });

  it("失敗時はsuccess=falseでisError=true", () => {
    const errors: CompileError[] = [{ file: "Main.java", line: 10, severity: "error", message: "cannot find symbol" }];
    const result = formatBuildResult(makeCommandResult({ exitCode: 1, stderr: "compilation failed" }), errors);
    expect(result.isError).toBe(true);
    const parsed = parseBuildResult(result);
    expect(parsed.success).toBe(false);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].file).toBe("Main.java");
  });

  it("truncatedフラグが伝搬する", () => {
    const result = formatBuildResult(makeCommandResult({ truncated: true, stdout: "partial..." }), []);
    const parsed = parseBuildResult(result);
    expect(parsed.truncated).toBe(true);
  });

  it("timedOutフラグが伝搬する", () => {
    const result = formatBuildResult(makeCommandResult({ exitCode: null, timedOut: true }), []);
    const parsed = parseBuildResult(result);
    expect(parsed.timedOut).toBe(true);
    expect(parsed.exitCode).toBeNull();
  });

  it("testSummaryが含まれる", () => {
    const summary = { testsRun: 10, testsPassed: 8, testsFailed: 1, testsSkipped: 1 };
    const result = formatBuildResult(makeCommandResult({ stdout: "test output" }), [], summary);
    const parsed = parseBuildResult(result);
    expect(parsed.testSummary).toEqual(summary);
  });

  it("testSummaryが未指定のときはundefined", () => {
    const result = formatBuildResult(makeCommandResult(), []);
    const parsed = parseBuildResult(result);
    expect(parsed.testSummary).toBeUndefined();
  });

  it("stdout + stderrがrawOutputに結合される", () => {
    const result = formatBuildResult(makeCommandResult({ stdout: "out", stderr: "err" }), []);
    const parsed = parseBuildResult(result);
    expect(parsed.rawOutput).toBe("out\nerr");
  });

  it("レスポンスがJSON文字列である", () => {
    const result = formatBuildResult(makeCommandResult(), []);
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });
});
