import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Config } from "../config.js";
import { workspaceTools } from "./workspace.js";

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };

function findTool(name: string) {
  const tool = workspaceTools.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  return tool;
}

describe("workspaceTools", () => {
  it(".copilot-docs 配下にファイルを書き込む", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-workspace-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const tool = findTool("copilot_docs_write");
    const result = await tool.handler({
      workingDirectory: tmpDir,
      path: "guides/ui.md",
      content: "# UI\n",
    }, mockConfig);

    expect(result.isError).toBeUndefined();
    expect(readFileSync(join(tmpDir, ".copilot-docs", "guides", "ui.md"), "utf-8")).toBe("# UI\n");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it(".copilot-work 外のパスを拒否する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-workspace-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const tool = findTool("copilot_work_write");
    const result = await tool.handler({
      workingDirectory: tmpDir,
      path: "../escape.txt",
      content: "invalid",
    }, mockConfig);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("外のファイル");

    rmSync(tmpDir, { recursive: true, force: true });
  });
});