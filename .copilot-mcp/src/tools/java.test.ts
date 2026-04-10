import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../config.js";
import { javaTools } from "./java.js";

vi.mock("../executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../executor.js";

const mockExecuteCommand = vi.mocked(executeCommand);
const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };
const mockResult = { exitCode: 0, stdout: "ok", stderr: "", truncated: false, timedOut: false };

function findTool(name: string) {
  const tool = javaTools.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  return tool;
}

describe("javaTools", () => {
  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue(mockResult);
  });

  describe("java_compile", () => {
    it("sourceDirectory 配下の Java ファイルを javac でコンパイルする", async () => {
      const tmpDir = join(tmpdir(), `mcp-test-java-${Date.now()}`);
      const srcDir = join(tmpDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "Main.java"), "class Main {}\n");

      const tool = findTool("java_compile");
      await tool.handler({ workingDirectory: tmpDir, sourceDirectory: "src" }, mockConfig);

      const expectedOutputDirectory = join(tmpDir, ".copilot-work", "java-classes");
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "javac",
        ["-d", expectedOutputDirectory, join(srcDir, "Main.java")],
        tmpDir,
        5000,
        10000,
      );

      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("対象ファイルが見つからない場合はエラーを返す", async () => {
      const tmpDir = join(tmpdir(), `mcp-test-java-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });

      const tool = findTool("java_compile");
      const result = await tool.handler({ workingDirectory: tmpDir, sourceDirectory: "src" }, mockConfig);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("見つかりません");
      expect(mockExecuteCommand).not.toHaveBeenCalled();

      rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("java_run", () => {
    it("追加クラスパスと引数を付けて java を実行する", async () => {
      const tool = findTool("java_run");
      const tmpDir = join(tmpdir(), `mcp-test-java-${Date.now()}`);
      const classesDir = join(tmpDir, "out");
      const classpathSeparator = process.platform === "win32" ? ";" : ":";

      await tool.handler({
        workingDirectory: tmpDir,
        compiledClassesDirectory: "out",
        classpath: "lib/example.jar",
        mainClass: "com.example.Main",
        args: ["--port=8080"],
      }, mockConfig);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "java",
        ["-cp", `${classesDir}${classpathSeparator}lib/example.jar`, "com.example.Main", "--port=8080"],
        tmpDir,
        5000,
        10000,
      );

      rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});