import type { CompileError, TestSummary } from "./format.js";

// ── javac パーサー（Java / Maven / Gradle 共用） ──

const JAVAC_RE = /^(.+\.java):(\d+): (error|warning): (.+)$/gm;

export function parseJavacErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  let m: RegExpExecArray | null;
  while ((m = JAVAC_RE.exec(output)) !== null) {
    errors.push({
      file: m[1],
      line: Number(m[2]),
      severity: m[3] as "error" | "warning",
      message: m[4],
    });
  }
  JAVAC_RE.lastIndex = 0;
  return errors;
}

// ── Maven パーサー ──

const MAVEN_RE = /^\[ERROR\]\s+(.+\.java):\[(\d+),(\d+)\]\s+(.+)$/gm;

export function parseMavenErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  let m: RegExpExecArray | null;
  while ((m = MAVEN_RE.exec(output)) !== null) {
    errors.push({
      file: m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      severity: "error",
      message: m[4],
    });
  }
  MAVEN_RE.lastIndex = 0;
  // javac 形式も併用
  return [...errors, ...parseJavacErrors(output)];
}

// ── Gradle パーサー ──

export function parseGradleErrors(output: string): CompileError[] {
  // Gradle は javac 出力をそのまま含むため再利用
  return parseJavacErrors(output);
}

// ── dotnet / MSBuild パーサー ──

const DOTNET_RE = /^(.+?)\((\d+),(\d+)\): (error|warning) \w+: (.+)$/gm;

export function parseDotnetErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  let m: RegExpExecArray | null;
  while ((m = DOTNET_RE.exec(output)) !== null) {
    errors.push({
      file: m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      severity: m[4] as "error" | "warning",
      message: m[5],
    });
  }
  DOTNET_RE.lastIndex = 0;
  return errors;
}

// ── npm / TypeScript パーサー ──

const TSC_RE = /^(.+\.tsx?)\((\d+),(\d+)\): (error|warning) TS\d+: (.+)$/gm;
const NPM_ERR_RE = /^npm ERR! (.+)$/gm;

export function parseNpmErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  let m: RegExpExecArray | null;
  while ((m = TSC_RE.exec(output)) !== null) {
    errors.push({
      file: m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      severity: m[4] as "error" | "warning",
      message: m[5],
    });
  }
  TSC_RE.lastIndex = 0;
  while ((m = NPM_ERR_RE.exec(output)) !== null) {
    errors.push({
      severity: "error",
      message: m[1],
    });
  }
  NPM_ERR_RE.lastIndex = 0;
  return errors;
}

// ── テスト結果パーサー ──

const MAVEN_TEST_RE = /Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/;

export function parseMavenTestSummary(output: string): TestSummary | undefined {
  const m = MAVEN_TEST_RE.exec(output);
  if (!m) return undefined;
  const run = Number(m[1]);
  const failures = Number(m[2]);
  const errors = Number(m[3]);
  const skipped = Number(m[4]);
  return {
    testsRun: run,
    testsPassed: run - failures - errors - skipped,
    testsFailed: failures + errors,
    testsSkipped: skipped,
  };
}

const GRADLE_TEST_RE = /(\d+) tests completed, (\d+) failed/;
const GRADLE_TEST_SKIPPED_RE = /(\d+) tests skipped/;

export function parseGradleTestSummary(output: string): TestSummary | undefined {
  const m = GRADLE_TEST_RE.exec(output);
  if (!m) return undefined;
  const completed = Number(m[1]);
  const failed = Number(m[2]);
  const skippedMatch = GRADLE_TEST_SKIPPED_RE.exec(output);
  const skipped = skippedMatch ? Number(skippedMatch[1]) : 0;
  return {
    testsRun: completed + skipped,
    testsPassed: completed - failed,
    testsFailed: failed,
    testsSkipped: skipped,
  };
}

const DOTNET_TOTAL_RE = /Total tests: (\d+)/;
const DOTNET_PASSED_RE = /Passed: (\d+)/;
const DOTNET_FAILED_RE = /Failed: (\d+)/;
const DOTNET_SKIPPED_RE = /Skipped: (\d+)/;

export function parseDotnetTestSummary(output: string): TestSummary | undefined {
  const totalMatch = DOTNET_TOTAL_RE.exec(output);
  if (!totalMatch) return undefined;
  const total = Number(totalMatch[1]);
  const passed = DOTNET_PASSED_RE.exec(output);
  const failed = DOTNET_FAILED_RE.exec(output);
  const skipped = DOTNET_SKIPPED_RE.exec(output);
  return {
    testsRun: total,
    testsPassed: passed ? Number(passed[1]) : 0,
    testsFailed: failed ? Number(failed[1]) : 0,
    testsSkipped: skipped ? Number(skipped[1]) : 0,
  };
}
