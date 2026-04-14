import { describe, it, expect, vi, beforeEach } from "vitest";
import { dotnetTools } from "./dotnet.js";
import type { Config } from "../config.js";

vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";
const mockExecuteCommand = vi.mocked(executeCommand);

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };
const mockResult = { exitCode: 0, stdout: "ok", stderr: "", truncated: false, timedOut: false };

function findTool(name: string) {
  const tool = dotnetTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("dotnetTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("dotnet_test", () => {
    it("基本的なテスト実行", async () => {
      const tool = findTool("dotnet_test");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["test"], "/test", 5000, 10000,
      );
    });

    it("フィルタ指定で実行", async () => {
      const tool = findTool("dotnet_test");
      await tool.handler({ workingDirectory: "/test", filter: "FullyQualifiedName~MyTest" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["test", "--filter", "FullyQualifiedName~MyTest"], "/test", 5000, 10000,
      );
    });

    it("プロジェクト指定で実行", async () => {
      const tool = findTool("dotnet_test");
      await tool.handler({ workingDirectory: "/test", project: "MyProject.Tests" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["test", "MyProject.Tests"], "/test", 5000, 10000,
      );
    });

    it("テスト結果を構造化レスポンスで返す", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        stdout: "Total tests: 10\nPassed: 8\nFailed: 1\nSkipped: 1",
        stderr: "",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("dotnet_test");
      const response = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.testSummary).toEqual({
        testsRun: 10,
        testsPassed: 8,
        testsFailed: 1,
        testsSkipped: 1,
      });
    });
  });

  describe("dotnet_build", () => {
    it("基本的なビルド実行", async () => {
      const tool = findTool("dotnet_build");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["build"], "/test", 5000, 10000,
      );
    });

    it("ビルドエラーを構造化レスポンスで返す", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        stdout: "Program.cs(10,5): error CS1002: ; expected",
        stderr: "",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("dotnet_build");
      const response = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
      expect(parsed.errors[0].file).toBe("Program.cs");
      expect(response.isError).toBe(true);
    });
  });

  describe("dotnet_run", () => {
    it("基本実行", async () => {
      const tool = findTool("dotnet_run");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["run"], "/test", 5000, 10000,
      );
    });

    it("プロジェクト指定で実行", async () => {
      const tool = findTool("dotnet_run");
      await tool.handler({ workingDirectory: "/test", project: "MyApp" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["run", "--project", "MyApp"], "/test", 5000, 10000,
      );
    });
  });

  describe("dotnet_clean", () => {
    it("基本的なクリーン実行", async () => {
      const tool = findTool("dotnet_clean");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["clean"], "/test", 5000, 10000,
      );
    });

    it("構造化レスポンスを返す", async () => {
      const tool = findTool("dotnet_clean");
      const response = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toEqual([]);
    });
  });

  describe("dotnet_restore", () => {
    it("基本的なリストア実行", async () => {
      const tool = findTool("dotnet_restore");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["restore"], "/test", 5000, 10000,
      );
    });
  });

  describe("dotnet_dependencies", () => {
    it("基本的な依存パッケージ一覧表示", async () => {
      const tool = findTool("dotnet_dependencies");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["list", "package"], "/test", 5000, 10000,
      );
    });

    it("プロジェクト指定で実行", async () => {
      const tool = findTool("dotnet_dependencies");
      await tool.handler({ workingDirectory: "/test", project: "MyApp.csproj" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["list", "MyApp.csproj", "package"], "/test", 5000, 10000,
      );
    });
  });
});
