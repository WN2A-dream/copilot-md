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

describe("mavenTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("maven_test", () => {
    it("基本的なテスト実行", async () => {
      const tool = findTool("maven_test");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["test"], "/test", 5000, 10000,
      );
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
  });

  describe("maven_verify", () => {
    it("基本的なverify実行", async () => {
      const tool = findTool("maven_verify");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["verify"], "/test", 5000, 10000,
      );
    });
  });

  describe("maven_compile", () => {
    it("基本的なcompile実行", async () => {
      const tool = findTool("maven_compile");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["compile"], "/test", 5000, 10000,
      );
    });
  });

  describe("maven_clean", () => {
    it("基本的なclean実行", async () => {
      const tool = findTool("maven_clean");
      await tool.handler({ workingDirectory: "/test" }, mockConfig);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "mvn", ["clean"], "/test", 5000, 10000,
      );
    });
  });
});
