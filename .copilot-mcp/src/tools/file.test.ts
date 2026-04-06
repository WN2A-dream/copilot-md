import { describe, it, expect } from "vitest";
import { fileTools } from "./file.js";
import type { Config } from "../config.js";
import { writeFileSync, mkdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };

function findTool(name: string) {
  const tool = fileTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("fileTools", () => {
  describe("file_info", () => {
    it("ファイル情報を返す", async () => {
      const tmpDir = join(tmpdir(), `mcp-test-file-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      const filePath = join(tmpDir, "test.txt");
      writeFileSync(filePath, "line1\nline2\nline3\n");

      const tool = findTool("file_info");
      const result = await tool.handler({ workingDirectory: tmpDir, path: "test.txt" }, mockConfig);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("test.txt");
      expect(result.content[0].text).toContain("行数: 3");
      expect(result.content[0].text).toContain("ファイル");

      unlinkSync(filePath);
      rmdirSync(tmpDir);
    });

    it("ワーキングディレクトリ外へのアクセスを拒否する", async () => {
      const tmpDir = join(tmpdir(), `mcp-test-file-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });

      const tool = findTool("file_info");
      const result = await tool.handler({ workingDirectory: tmpDir, path: "../../etc/passwd" }, mockConfig);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("ワーキングディレクトリ外");

      rmdirSync(tmpDir);
    });

    it("存在しないファイルでエラーを返す", async () => {
      const tmpDir = join(tmpdir(), `mcp-test-file-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });

      const tool = findTool("file_info");
      const result = await tool.handler({ workingDirectory: tmpDir, path: "nonexistent.txt" }, mockConfig);

      expect(result.isError).toBe(true);

      rmdirSync(tmpDir);
    });
  });
});
