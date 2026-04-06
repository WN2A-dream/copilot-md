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
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["test"], "/test", 5000, 10000,
      );
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
  });

  describe("gradle_build", () => {
    it("基本的なビルド実行", async () => {
      const tool = findTool("gradle_build");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["build"], "/test", 5000, 10000,
      );
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
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCommand, ["clean"], "/test", 5000, 10000,
      );
    });
  });
});
