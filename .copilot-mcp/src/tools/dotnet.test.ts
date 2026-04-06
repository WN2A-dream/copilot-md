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
  });

  describe("dotnet_build", () => {
    it("基本的なビルド実行", async () => {
      const tool = findTool("dotnet_build");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "dotnet", ["build"], "/test", 5000, 10000,
      );
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
});
