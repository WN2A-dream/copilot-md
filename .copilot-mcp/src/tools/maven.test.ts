import { describe, it, expect, vi, beforeEach } from "vitest";
import { mavenTools } from "./maven.js";
import type { Config } from "../config.js";

vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";
const mockExecuteCommand = vi.mocked(executeCommand);

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };
const mockResult = { exitCode: 0, stdout: "ok", stderr: "", truncated: false, timedOut: false };

function findTool(name: string) {
  const tool = mavenTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

function parseBuildResult(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

describe("mavenTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("maven_test", () => {
    it("基本的なテスト実行", async () => {
      const tool = findTool("maven_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["test"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.errors).toEqual([]);
    });

    it("テストクラス指定で実行", async () => {
      const tool = findTool("maven_test");
      await tool.handler({ workingDirectory: "/test", testClass: "com.example.FooTest" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["test", "-Dtest=com.example.FooTest"], "/test", 5000, 10000,
      );
    });

    it("モジュール指定で実行", async () => {
      const tool = findTool("maven_test");
      await tool.handler({ workingDirectory: "/test", module: "core" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["test", "-pl", "core"], "/test", 5000, 10000,
      );
    });

    it("テスト結果サマリーがパースされる", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        stdout: "Tests run: 10, Failures: 1, Errors: 0, Skipped: 2",
        stderr: "",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("maven_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = parseBuildResult(result);
      expect(parsed.testSummary).toEqual({
        testsRun: 10,
        testsPassed: 7,
        testsFailed: 1,
        testsSkipped: 2,
      });
    });

    it("コンパイルエラーが構造化される", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "[ERROR] /src/Main.java:[5,10] cannot find symbol",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("maven_test");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
      expect(parsed.errors[0].file).toBe("/src/Main.java");
    });
  });

  describe("maven_verify", () => {
    it("基本的なverify実行", async () => {
      const tool = findTool("maven_verify");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["verify"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("maven_compile", () => {
    it("基本的なcompile実行", async () => {
      const tool = findTool("maven_compile");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["compile"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toEqual([]);
    });
  });

  describe("maven_clean", () => {
    it("基本的なclean実行", async () => {
      const tool = findTool("maven_clean");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["clean"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("maven_dependencies", () => {
    it("基本的な依存関係ツリー表示", async () => {
      const tool = findTool("maven_dependencies");
      const result = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["dependency:tree"], "/test", 5000, 10000,
      );
      const parsed = parseBuildResult(result);
      expect(parsed.success).toBe(true);
    });

    it("モジュール指定で実行", async () => {
      const tool = findTool("maven_dependencies");
      await tool.handler({ workingDirectory: "/test", module: "core" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["dependency:tree", "-pl", "core"], "/test", 5000, 10000,
      );
    });
  });
});
