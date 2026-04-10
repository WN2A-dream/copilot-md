import { describe, it, expect, vi, beforeEach } from "vitest";
import { gitTools } from "./git.js";
import type { Config } from "../config.js";

// executeCommandをモック
vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";
const mockExecuteCommand = vi.mocked(executeCommand);

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };

const mockResult = {
  exitCode: 0,
  stdout: "mock output",
  stderr: "",
  truncated: false,
  timedOut: false,
};

function findTool(name: string) {
  const tool = gitTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("gitTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("git_status", () => {
    it("git statusを実行する", async () => {
      const tool = findTool("git_status");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["status"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_checkout", () => {
    it("ブランチをチェックアウトする", async () => {
      const tool = findTool("git_checkout");
      await tool.handler({ workingDirectory: "/test", target: "main" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["checkout", "main"], "/test", 5000, 10000,
      );
    });

    it("ハイフンで始まるターゲットを拒否する", async () => {
      const tool = findTool("git_checkout");
      const result = await tool.handler({ workingDirectory: "/test", target: "--orphan" }, mockConfig);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("ハイフン");
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe("git_branch", () => {
    it("ブランチ一覧を表示する", async () => {
      const tool = findTool("git_branch");
      await tool.handler({ workingDirectory: "/test", list: true }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["branch", "--list"], "/test", 5000, 10000,
      );
    });

    it("新しいブランチを作成する", async () => {
      const tool = findTool("git_branch");
      await tool.handler({ workingDirectory: "/test", name: "feature/x" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["branch", "feature/x"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_log", () => {
    it("oneline + maxCountオプション付きで実行する", async () => {
      const tool = findTool("git_log");
      await tool.handler({ workingDirectory: "/test", oneline: true, maxCount: 5 }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["log", "--oneline", "-n", "5"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_diff", () => {
    it("staged オプション付きで実行する", async () => {
      const tool = findTool("git_diff");
      await tool.handler({ workingDirectory: "/test", staged: true }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["diff", "--staged"], "/test", 5000, 10000,
      );
    });

    it("ターゲット指定で実行する", async () => {
      const tool = findTool("git_diff");
      await tool.handler({ workingDirectory: "/test", target: "HEAD~1" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["diff", "HEAD~1"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_fetch", () => {
    it("リモート名なしで実行する", async () => {
      const tool = findTool("git_fetch");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["fetch"], "/test", 5000, 10000,
      );
    });

    it("リモート名指定で実行する", async () => {
      const tool = findTool("git_fetch");
      await tool.handler({ workingDirectory: "/test", remote: "origin" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["fetch", "origin"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_pull", () => {
    it("リモートとブランチ指定で実行する", async () => {
      const tool = findTool("git_pull");
      await tool.handler({ workingDirectory: "/test", remote: "origin", branch: "main" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["pull", "origin", "main"], "/test", 5000, 10000,
      );
    });
  });

  describe("git_check_ignore", () => {
    it("-- セパレータ付きでパスをチェックする", async () => {
      const tool = findTool("git_check_ignore");
      await tool.handler({ workingDirectory: "/test", paths: ["node_modules", ".env"] }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "git", ["check-ignore", "--", "node_modules", ".env"], "/test", 5000, 10000,
      );
    });
  });
});
