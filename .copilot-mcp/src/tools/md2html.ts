import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, normalize, relative, resolve, sep } from "node:path";
import MarkdownIt from "markdown-it";
import { z } from "zod";
import type { Config } from "../config.js";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const md2htmlSchema = z.object({
  workingDirectory: workingDirectorySchema,
  sourcePath: z.string().describe("変換元の Markdown ファイルまたはディレクトリ"),
  outputPath: z.string().optional().describe("HTML 出力先。省略時は sourcePath に応じて自動決定"),
  includeSearch: z.boolean().optional().describe("検索 UI を生成するか。省略時は true"),
});

interface RenderedPage {
  title: string;
  sourceFile: string;
  outputFile: string;
  relativeOutputPath: string;
  bodyHtml: string;
}

function ensureWithinWorkspace(workingDirectory: string, targetPath: string, label: string): string {
  const resolved = normalize(resolve(workingDirectory, targetPath));
  const normalizedCwd = normalize(workingDirectory);
  if (resolved !== normalizedCwd && !resolved.startsWith(normalizedCwd + sep)) {
    throw new Error(`${label} はワーキングディレクトリ内を指定してください`);
  }
  return resolved;
}

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(entryPath);
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      return [entryPath];
    }
    return [];
  }));
  return nested.flat().sort();
}

function toHtmlFileName(markdownPath: string): string {
  return markdownPath.replace(/\.md$/i, ".html");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deriveTitle(markdownSource: string, fallbackFileName: string): string {
  const heading = markdownSource.match(/^#\s+(.+)$/m);
  return heading?.[1].trim() ?? fallbackFileName.replace(/\.md$/i, "");
}

function buildDocumentHtml(page: RenderedPage, pages: RenderedPage[], includeSearch: boolean): string {
  const navItems = pages.map((entry) => {
    const href = relative(dirname(page.outputFile), entry.outputFile).replaceAll("\\", "/");
    const isCurrent = entry.outputFile === page.outputFile;
    return `<li><a href="${escapeHtml(href)}"${isCurrent ? " aria-current=\"page\"" : ""}>${escapeHtml(entry.title)}</a></li>`;
  }).join("\n");

  const searchPanel = includeSearch ? `
      <section class="search-panel" aria-label="ページ内検索">
        <label for="page-search">ページ内検索</label>
        <input id="page-search" type="search" placeholder="見出しや本文を検索" />
        <p id="search-status">検索語を入力すると該当箇所を強調表示します。</p>
      </section>` : "";

  const searchScript = includeSearch ? `
      <script>
        const searchInput = document.getElementById("page-search");
        const searchStatus = document.getElementById("search-status");
        const targets = Array.from(document.querySelectorAll("article h1, article h2, article h3, article h4, article p, article li, article pre, article td, article th"));

        const clearHits = () => {
          for (const target of targets) {
            target.classList.remove("search-hit");
          }
        };

        if (searchInput && searchStatus) {
          searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            clearHits();

            if (!query) {
              searchStatus.textContent = "検索語を入力すると該当箇所を強調表示します。";
              return;
            }

            const hits = targets.filter((target) => target.textContent && target.textContent.toLowerCase().includes(query));
            for (const hit of hits) {
              hit.classList.add("search-hit");
            }

            if (hits.length > 0) {
              hits[0].scrollIntoView({ behavior: "smooth", block: "center" });
            }

            searchStatus.textContent = hits.length + " 件ヒットしました。";
          });
        }
      </script>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(page.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe6;
        --surface: rgba(255, 252, 247, 0.92);
        --surface-strong: #fffaf1;
        --ink: #2d2418;
        --muted: #6e6255;
        --line: rgba(106, 88, 62, 0.18);
        --accent: #915f36;
        --accent-soft: rgba(145, 95, 54, 0.12);
        --hit: #ffe29a;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Yu Gothic UI", "Hiragino Sans", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(205, 179, 136, 0.24), transparent 28%),
          linear-gradient(180deg, #fcf7ef 0%, var(--bg) 100%);
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
        gap: 24px;
        padding: 24px;
      }

      nav, main {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(92, 71, 44, 0.08);
      }

      nav {
        padding: 20px;
        position: sticky;
        top: 24px;
        align-self: start;
      }

      nav h1 {
        margin: 0 0 8px;
        font-size: 1.1rem;
      }

      nav p {
        margin: 0 0 16px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }

      nav a {
        display: block;
        padding: 10px 12px;
        border-radius: 12px;
        color: inherit;
        text-decoration: none;
        background: transparent;
      }

      nav a[aria-current="page"] {
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }

      main {
        padding: 28px;
      }

      .search-panel {
        margin-bottom: 24px;
        padding: 16px;
        border-radius: 16px;
        background: var(--surface-strong);
        border: 1px solid var(--line);
      }

      .search-panel label {
        display: block;
        margin-bottom: 8px;
        font-weight: 700;
      }

      .search-panel input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        font: inherit;
        background: white;
      }

      .search-panel p {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.92rem;
      }

      article {
        line-height: 1.75;
      }

      article h1, article h2, article h3, article h4 {
        line-height: 1.3;
      }

      article pre {
        overflow-x: auto;
        padding: 14px;
        border-radius: 14px;
        background: #2a2118;
        color: #f8f1e4;
      }

      article code {
        font-family: "Cascadia Code", Consolas, monospace;
      }

      article table {
        border-collapse: collapse;
        width: 100%;
      }

      article th, article td {
        border: 1px solid var(--line);
        padding: 10px 12px;
        text-align: left;
      }

      .search-hit {
        background: linear-gradient(180deg, transparent 0%, transparent 20%, var(--hit) 20%, var(--hit) 100%);
      }

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }

        nav {
          position: static;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <nav>
        <h1>資料ナビゲーション</h1>
        <p>生成済み HTML を横断して閲覧できます。</p>
        <ul>
          ${navItems}
        </ul>
      </nav>
      <main>
        ${searchPanel}
        <article>
          ${page.bodyHtml}
        </article>
      </main>
    </div>
    ${searchScript}
  </body>
</html>`;
}

function buildIndexHtml(pages: RenderedPage[], includeSearch: boolean): string {
  const items = pages.map((page) => `
      <li data-search-text="${escapeHtml(`${page.title} ${page.relativeOutputPath}`)}">
        <a href="${escapeHtml(page.relativeOutputPath.replaceAll("\\", "/"))}">${escapeHtml(page.title)}</a>
        <span>${escapeHtml(page.relativeOutputPath.replaceAll("\\", "/"))}</span>
      </li>`).join("\n");

  const searchScript = includeSearch ? `
    <script>
      const input = document.getElementById("index-search");
      const items = Array.from(document.querySelectorAll("[data-search-text]"));

      if (input) {
        input.addEventListener("input", () => {
          const query = input.value.trim().toLowerCase();
          for (const item of items) {
            const matched = !query || item.dataset.searchText.toLowerCase().includes(query);
            item.hidden = !matched;
          }
        });
      }
    </script>` : "";

  const searchPanel = includeSearch ? `
      <div class="search-panel">
        <label for="index-search">資料検索</label>
        <input id="index-search" type="search" placeholder="タイトルやファイル名を検索" />
      </div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown HTML Index</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: "Yu Gothic UI", "Hiragino Sans", sans-serif;
        color: #2d2418;
        background: linear-gradient(180deg, #fdf9f1 0%, #efe8da 100%);
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 28px;
        border-radius: 24px;
        background: rgba(255, 251, 245, 0.92);
        border: 1px solid rgba(106, 88, 62, 0.16);
        box-shadow: 0 20px 60px rgba(92, 71, 44, 0.08);
      }

      h1 { margin-top: 0; }

      .search-panel {
        margin: 20px 0 24px;
      }

      .search-panel label {
        display: block;
        margin-bottom: 8px;
        font-weight: 700;
      }

      .search-panel input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid rgba(106, 88, 62, 0.2);
        font: inherit;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 12px;
      }

      li {
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(145, 95, 54, 0.08);
      }

      a {
        color: #6b4324;
        font-weight: 700;
        text-decoration: none;
      }

      span {
        display: block;
        margin-top: 4px;
        color: #6e6255;
        font-size: 0.92rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>HTML 化された Markdown 資料</h1>
      <p>生成された各ページをここから開けます。</p>
      ${searchPanel}
      <ul>
        ${items}
      </ul>
    </main>
    ${searchScript}
  </body>
</html>`;
}

export const md2htmlTools = [
  {
    name: "md2html",
    description: "Markdown ファイルまたはディレクトリを検索 UI 付き HTML に変換する",
    inputSchema: md2htmlSchema,
    handler: async (args: unknown, _config: Config) => {
      try {
        const { workingDirectory, sourcePath, outputPath, includeSearch } = md2htmlSchema.parse(args);
        const resolvedSourcePath = ensureWithinWorkspace(workingDirectory, sourcePath, "sourcePath");
        const sourceStat = await stat(resolvedSourcePath);
        const searchEnabled = includeSearch ?? true;

        if (sourceStat.isFile()) {
          const markdownSource = await readFile(resolvedSourcePath, "utf-8");
          const title = deriveTitle(markdownSource, basename(resolvedSourcePath));
          const resolvedOutputPath = ensureWithinWorkspace(
            workingDirectory,
            outputPath ?? toHtmlFileName(sourcePath),
            "outputPath",
          );
          const page: RenderedPage = {
            title,
            sourceFile: resolvedSourcePath,
            outputFile: resolvedOutputPath,
            relativeOutputPath: basename(resolvedOutputPath),
            bodyHtml: markdown.render(markdownSource),
          };

          await mkdir(dirname(resolvedOutputPath), { recursive: true });
          await writeFile(resolvedOutputPath, buildDocumentHtml(page, [page], searchEnabled), "utf-8");

          return {
            content: [{ type: "text" as const, text: `変換完了: 1 ファイル -> ${relative(workingDirectory, resolvedOutputPath)}` }],
          };
        }

        if (!sourceStat.isDirectory()) {
          return {
            content: [{ type: "text" as const, text: "エラー: sourcePath は Markdown ファイルまたはディレクトリを指定してください" }],
            isError: true,
          };
        }

        const markdownFiles = await collectMarkdownFiles(resolvedSourcePath);
        if (markdownFiles.length === 0) {
          return {
            content: [{ type: "text" as const, text: "エラー: 変換対象の Markdown ファイルが見つかりません" }],
            isError: true,
          };
        }

        const defaultOutputDirectory = `${sourcePath.replace(/[\\/]$/, "")}-html`;
        const resolvedOutputDirectory = ensureWithinWorkspace(
          workingDirectory,
          outputPath ?? defaultOutputDirectory,
          "outputPath",
        );

        const pages: RenderedPage[] = [];
        for (const markdownFile of markdownFiles) {
          const markdownSource = await readFile(markdownFile, "utf-8");
          const relativeMarkdownPath = relative(resolvedSourcePath, markdownFile);
          const outputFile = resolve(resolvedOutputDirectory, toHtmlFileName(relativeMarkdownPath));
          pages.push({
            title: deriveTitle(markdownSource, basename(markdownFile)),
            sourceFile: markdownFile,
            outputFile,
            relativeOutputPath: relative(resolvedOutputDirectory, outputFile),
            bodyHtml: markdown.render(markdownSource),
          });
        }

        await mkdir(resolvedOutputDirectory, { recursive: true });
        for (const page of pages) {
          await mkdir(dirname(page.outputFile), { recursive: true });
          await writeFile(page.outputFile, buildDocumentHtml(page, pages, searchEnabled), "utf-8");
        }

        await writeFile(resolve(resolvedOutputDirectory, "index.html"), buildIndexHtml(pages, searchEnabled), "utf-8");

        return {
          content: [{
            type: "text" as const,
            text: `変換完了: ${pages.length} ファイル -> ${relative(workingDirectory, resolvedOutputDirectory)}`,
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `エラー: ${message}` }],
          isError: true,
        };
      }
    },
  },
];