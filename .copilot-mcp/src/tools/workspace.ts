import { mkdir, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import { z } from "zod";
import type { Config } from "../config.js";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const scopedWriteSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ディレクトリ配下の相対ファイルパス"),
  content: z.string().describe("書き込むテキスト内容"),
});

function resolveScopedPath(workingDirectory: string, scopeDirectory: string, relativePath: string): string {
  const scopeRoot = normalize(resolve(workingDirectory, scopeDirectory));
  const targetPath = normalize(resolve(scopeRoot, relativePath));

  if (targetPath !== scopeRoot && !targetPath.startsWith(scopeRoot + sep)) {
    throw new Error(`${scopeDirectory} 外のファイルは操作できません`);
  }

  return targetPath;
}

function createScopedWriteTool(name: string, scopeDirectory: string, label: string) {
  return {
    name,
    description: `${label} 配下のファイルを作成または上書きする`,
    inputSchema: scopedWriteSchema,
    handler: async (args: unknown, _config: Config) => {
      const { workingDirectory, path, content } = scopedWriteSchema.parse(args);

      try {
        const targetPath = resolveScopedPath(workingDirectory, scopeDirectory, path);
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, "utf-8");

        return {
          content: [{ type: "text" as const, text: `書き込み完了: ${scopeDirectory}/${path}` }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `エラー: ${message}` }],
          isError: true,
        };
      }
    },
  };
}

export const workspaceTools = [
  createScopedWriteTool("copilot_docs_write", ".copilot-docs", ".copilot-docs"),
  createScopedWriteTool("copilot_work_write", ".copilot-work", ".copilot-work"),
];