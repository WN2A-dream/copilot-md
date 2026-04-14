import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Config } from "../config.js";
import { md2htmlTools } from "./md2html.js";

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };

function findTool() {
  const tool = md2htmlTools.find((entry) => entry.name === "md2html");
  if (!tool) {
    throw new Error("Tool md2html not found");
  }
  return tool;
}

describe("md2htmlTools", () => {
  it("Markdown ファイルを検索 UI 付き HTML に変換する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-md2html-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "guide.md"), "# ガイド\n\n本文です。\n", "utf-8");

    const tool = findTool();
    const result = await tool.handler({ workingDirectory: tmpDir, sourcePath: "guide.md" }, mockConfig);

    expect(result.isError).toBeUndefined();
    const html = readFileSync(join(tmpDir, "guide.html"), "utf-8");
    expect(html).toContain("page-search");
    expect(html).toContain("<h1>ガイド</h1>");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("ディレクトリ配下の Markdown をまとめて変換し index.html を生成する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-md2html-${Date.now()}`);
    const docsDir = join(tmpDir, ".copilot-docs");
    mkdirSync(join(docsDir, "nested"), { recursive: true });
    writeFileSync(join(docsDir, "index.md"), "# 目次\n", "utf-8");
    writeFileSync(join(docsDir, "nested", "ui.md"), "# UI ガイド\n\n統一ルール\n", "utf-8");

    const tool = findTool();
    const result = await tool.handler({ workingDirectory: tmpDir, sourcePath: ".copilot-docs" }, mockConfig);

    expect(result.isError).toBeUndefined();
    expect(readFileSync(join(tmpDir, ".copilot-docs-html", "index.html"), "utf-8")).toContain("HTML 化された Markdown 資料");
    expect(readFileSync(join(tmpDir, ".copilot-docs-html", "nested", "ui.html"), "utf-8")).toContain("UI ガイド");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("Markdown 同士のリンクを html に変換し既存出力を再生成する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-md2html-${Date.now()}`);
    const docsDir = join(tmpDir, ".copilot-docs");
    const outputDir = join(tmpDir, ".copilot-docs-html");
    mkdirSync(join(docsDir, "nested"), { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(docsDir, "index.md"),
      "# 目次\n\n[UI ガイド](nested/ui.md)\n",
      "utf-8",
    );
    writeFileSync(
      join(docsDir, "nested", "ui.md"),
      "# UI ガイド\n\n[目次](../index.md#top)\n",
      "utf-8",
    );
    writeFileSync(join(outputDir, "stale.html"), "old output", "utf-8");

    const tool = findTool();
    const result = await tool.handler({
      workingDirectory: tmpDir,
      sourcePath: ".copilot-docs",
      outputPath: ".copilot-docs-html",
    }, mockConfig);

    expect(result.isError).toBeUndefined();
    expect(readFileSync(join(outputDir, "index.html"), "utf-8")).toContain('href="nested/ui.html"');
    expect(readFileSync(join(outputDir, "nested", "ui.html"), "utf-8")).toContain('href="../index.html#top"');
    expect(existsSync(join(outputDir, "stale.html"))).toBe(false);

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("ワークスペース外への出力を拒否する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-md2html-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "guide.md"), "# Guide\n", "utf-8");

    const tool = findTool();
    const result = await tool.handler({
      workingDirectory: tmpDir,
      sourcePath: "guide.md",
      outputPath: "../escape.html",
    }, mockConfig);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("ワーキングディレクトリ内");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("mermaid コードブロックを <pre class=\"mermaid\"> に変換し通常のコードブロックはそのまま出力する", async () => {
    const tmpDir = join(tmpdir(), `mcp-test-md2html-${Date.now()}`);
    const docsDir = join(tmpDir, ".copilot-docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "diagram.md"),
      "# ダイアグラム\n\n```mermaid\ngraph TD\n  A --> B\n```\n\n```js\nconsole.log('hello');\n```\n",
      "utf-8",
    );

    const tool = findTool();
    const result = await tool.handler({ workingDirectory: tmpDir, sourcePath: ".copilot-docs" }, mockConfig);

    expect(result.isError).toBeUndefined();
    const html = readFileSync(join(tmpDir, ".copilot-docs-html", "diagram.html"), "utf-8");
    expect(html).toContain('<pre class="mermaid">');
    expect(html).toContain("graph TD");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain("mermaid.initialize");

    rmSync(tmpDir, { recursive: true, force: true });
  });
});