import { describe, it, expect, vi, beforeEach } from "vitest";
import { gradleTools } from "./gradle.js";
import type { Config } from "../config.js";

vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";
const mockExecuteCommand = vi.mocked(executeCommand);

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };
const mockResult = { exitCode: 0, stdout: "ok", stderr: "", truncated: false, timedOut: false };

function findTool(name: string) {
  const tool = gradleTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

function parseBuildResult(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

// Windowsでは gradlew.bat, その他は ./gradlew
const expectedCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

describe("gradleTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("gradle_test", () => {
    it("基本的なテスト実行", async () => {
      const tool = findTool("gradle_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["test"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.errors).toEqual([]);
    });

    it("テストクラス指定で実行", async () => {
      const tool = findTool("gradle_test");
      await tool.handler({ workingDirectory: "/test", testClass: "com.example.FooTest" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["test", "--tests", "com.example.FooTest"], "/test", 5000, 10000,
      );
    });

    it("モジュール指定で実行", async () => {
      const tool = findTool("gradle_test");
      await tool.handler({ workingDirectory: "/test", module: "app" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, [":app:test"], "/test", 5000, 10000,
      );
    });

    it("テスト結果サマリーがパースされる", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        stdout: "5 tests completed, 1 failed\n1 tests skipped",
        stderr: "",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("gradle_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = parseBuildResult(result);
      expect(parsed.testSummary).toEqual({
        testsRun: 6,
        testsPassed: 4,
        testsFailed: 1,
        testsSkipped: 1,
      });
    });

    it("コンパイルエラーが構造化される", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "src/Main.java:10: error: cannot find symbol",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("gradle_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
      expect(parsed.errors[0].file).toBe("src/Main.java");
    });
  });

  describe("gradle_build", () => {
    it("基本的なビルド実行", async () => {
      const tool = findTool("gradle_build");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["build"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toEqual([]);
    });

    it("モジュール指定で実行", async () => {
      const tool = findTool("gradle_build");
      await tool.handler({ workingDirectory: "/test", module: "lib" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, [":lib:build"], "/test", 5000, 10000,
      );
    });
  });

  describe("gradle_clean", () => {
    it("基本的なクリーン実行", async () => {
      const tool = findTool("gradle_clean");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["clean"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("gradle_dependencies", () => {
    it("基本的な依存関係ツリー表示", async () => {
      const tool = findTool("gradle_dependencies");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["dependencies"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
    });

    it("モジュール指定で実行", async () => {
      const tool = findTool("gradle_dependencies");
      await tool.handler({ workingDirectory: "/test", module: "app" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, [":app:dependencies"], "/test", 5000, 10000,
      );
    });

    it("構成名指定で実行", async () => {
      const tool = findTool("gradle_dependencies");
      await tool.handler({ workingDirectory: "/test", configuration: "compileClasspath" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["dependencies", "--configuration", "compileClasspath"], "/test", 5000, 10000,
      );
    });
  });
});
