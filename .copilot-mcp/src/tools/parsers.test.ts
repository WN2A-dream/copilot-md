import { describe, it, expect } from "vitest";
import {
  parseJavacErrors,
  parseMavenErrors,
  parseGradleErrors,
  parseDotnetErrors,
  parseNpmErrors,
  parseMavenTestSummary,
  parseGradleTestSummary,
  parseDotnetTestSummary,
} from "./parsers.js";

describe("parseJavacErrors", () => {
  it("javac の error 行をパースする", () => {
    const output = `src/Main.java:10: error: cannot find symbol
        System.out.println(x);
                           ^
src/Main.java:15: warning: unchecked cast
        List list = (List) obj;
                    ^`;
    const errors = parseJavacErrors(output);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      file: "src/Main.java",
      line: 10,
      severity: "error",
      message: "cannot find symbol",
    });
    expect(errors[1]).toEqual({
      file: "src/Main.java",
      line: 15,
      severity: "warning",
      message: "unchecked cast",
    });
  });

  it("マッチしない出力では空配列を返す", () => {
    expect(parseJavacErrors("BUILD SUCCESSFUL")).toEqual([]);
  });
});

describe("parseMavenErrors", () => {
  it("Maven 形式のエラー行をパースする", () => {
    const output = `[ERROR] /project/src/App.java:[5,12] cannot find symbol`;
    const errors = parseMavenErrors(output);
    expect(errors.some((e) => e.file === "/project/src/App.java" && e.line === 5 && e.column === 12)).toBe(true);
  });

  it("javac 形式のエラーも併用してパースする", () => {
    const output = `src/App.java:20: error: ';' expected`;
    const errors = parseMavenErrors(output);
    expect(errors.some((e) => e.file === "src/App.java" && e.line === 20)).toBe(true);
  });
});

describe("parseGradleErrors", () => {
  it("javac 出力をそのままパースする", () => {
    const output = `> Task :compileJava FAILED
src/Main.java:3: error: package does.not.exist`;
    const errors = parseGradleErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("package does.not.exist");
  });
});

describe("parseDotnetErrors", () => {
  it("MSBuild 形式のエラー行をパースする", () => {
    const output = `Program.cs(10,5): error CS1002: ; expected
Program.cs(15,1): warning CS0168: The variable 'x' is declared but never used`;
    const errors = parseDotnetErrors(output);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      file: "Program.cs",
      line: 10,
      column: 5,
      severity: "error",
      message: "; expected",
    });
    expect(errors[1].severity).toBe("warning");
  });
});

describe("parseNpmErrors", () => {
  it("TypeScript エラーをパースする", () => {
    const output = `src/index.ts(5,10): error TS2304: Cannot find name 'foo'.`;
    const errors = parseNpmErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      file: "src/index.ts",
      line: 5,
      column: 10,
      severity: "error",
      message: "Cannot find name 'foo'.",
    });
  });

  it("npm ERR! メッセージをパースする", () => {
    const output = `npm ERR! code ELIFECYCLE
npm ERR! Exit status 1`;
    const errors = parseNpmErrors(output);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({ severity: "error", message: "code ELIFECYCLE" });
    expect(errors[1]).toEqual({ severity: "error", message: "Exit status 1" });
  });

  it(".tsx ファイルもマッチする", () => {
    const output = `src/App.tsx(12,3): error TS2322: Type 'string' is not assignable.`;
    const errors = parseNpmErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("src/App.tsx");
  });
});

describe("parseMavenTestSummary", () => {
  it("Maven テスト結果をパースする", () => {
    const output = `Tests run: 10, Failures: 2, Errors: 1, Skipped: 3`;
    const summary = parseMavenTestSummary(output);
    expect(summary).toEqual({
      testsRun: 10,
      testsPassed: 4,
      testsFailed: 3,
      testsSkipped: 3,
    });
  });

  it("テスト結果がない場合はundefined", () => {
    expect(parseMavenTestSummary("BUILD SUCCESS")).toBeUndefined();
  });
});

describe("parseGradleTestSummary", () => {
  it("Gradle テスト結果をパースする", () => {
    const output = `5 tests completed, 2 failed`;
    const summary = parseGradleTestSummary(output);
    expect(summary).toEqual({
      testsRun: 5,
      testsPassed: 3,
      testsFailed: 2,
      testsSkipped: 0,
    });
  });

  it("スキップ情報も含む場合", () => {
    const output = `10 tests completed, 1 failed
3 tests skipped`;
    const summary = parseGradleTestSummary(output);
    expect(summary).toEqual({
      testsRun: 13,
      testsPassed: 9,
      testsFailed: 1,
      testsSkipped: 3,
    });
  });

  it("テスト結果がない場合はundefined", () => {
    expect(parseGradleTestSummary("BUILD SUCCESSFUL")).toBeUndefined();
  });
});

describe("parseDotnetTestSummary", () => {
  it("dotnet テスト結果をパースする", () => {
    const output = `Total tests: 20
     Passed: 15
     Failed: 3
     Skipped: 2`;
    const summary = parseDotnetTestSummary(output);
    expect(summary).toEqual({
      testsRun: 20,
      testsPassed: 15,
      testsFailed: 3,
      testsSkipped: 2,
    });
  });

  it("テスト結果がない場合はundefined", () => {
    expect(parseDotnetTestSummary("Build succeeded.")).toBeUndefined();
  });
});
