import { describe, it, expect, vi, beforeEach } from "vitest";
import { npmTools } from "./npm.js";
import type { Config } from "../config.js";

vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";
const mockExecuteCommand = vi.mocked(executeCommand);

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };
const mockResult = { exitCode: 0, stdout: "ok", stderr: "", truncated: false, timedOut: false };

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function findTool(name: string) {
  const tool = npmTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("npmTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("npm_install", () => {
    it("基本的なインストール実行", async () => {
      const tool = findTool("npm_install");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["install"], "/test", 5000, 10000,
      );
    });

    it("追加引数付きで実行", async () => {
      const tool = findTool("npm_install");
      await tool.handler({ workingDirectory: "/test", args: ["--save-dev", "typescript"] }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["install", "--save-dev", "typescript"], "/test", 5000, 10000,
      );
    });
  });

  describe("npm_build", () => {
    it("デフォルトの build スクリプトを実行", async () => {
      const tool = findTool("npm_build");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["run", "build"], "/test", 5000, 10000,
      );
    });

    it("カスタムスクリプト名で実行", async () => {
      const tool = findTool("npm_build");
      await tool.handler({ workingDirectory: "/test", script: "build:prod" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["run", "build:prod"], "/test", 5000, 10000,
      );
    });
  });

  describe("npm_test", () => {
    it("基本的なテスト実行", async () => {
      const tool = findTool("npm_test");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["test"], "/test", 5000, 10000,
      );
    });

    it("追加引数付きで実行", async () => {
      const tool = findTool("npm_test");
      await tool.handler({ workingDirectory: "/test", args: ["--coverage"] }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["test", "--", "--coverage"], "/test", 5000, 10000,
      );
    });
  });

  describe("npm_run", () => {
    it("スクリプト名を指定して実行", async () => {
      const tool = findTool("npm_run");
      await tool.handler({ workingDirectory: "/test", script: "lint" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["run", "lint"], "/test", 5000, 10000,
      );
    });

    it("引数付きで実行", async () => {
      const tool = findTool("npm_run");
      await tool.handler({ workingDirectory: "/test", script: "lint", args: ["--fix"] }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["run", "lint", "--", "--fix"], "/test", 5000, 10000,
      );
    });
  });

  describe("npm_dependencies", () => {
    it("基本的な依存関係表示", async () => {
      const tool = findTool("npm_dependencies");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["ls", "--json"], "/test", 5000, 10000,
      );
    });

    it("深さ指定で実行", async () => {
      const tool = findTool("npm_dependencies");
      await tool.handler({ workingDirectory: "/test", depth: 1 }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        npmCommand, ["ls", "--json", "--depth=1"], "/test", 5000, 10000,
      );
    });
  });

  describe("構造化レスポンスの検証", () => {
    it("成功時に BuildResult JSON を返す", async () => {
      const tool = findTool("npm_install");
      const response = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.errors).toEqual([]);
      expect(response.isError).toBeUndefined();
    });

    it("失敗時に isError=true を返す", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "npm ERR! missing script: build",
        truncated: false,
        timedOut: false,
      });
      const tool = findTool("npm_build");
      const response = await tool.handler({ workingDirectory: "/test" }, mockConfig);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
      expect(response.isError).toBe(true);
    });
  });
});
