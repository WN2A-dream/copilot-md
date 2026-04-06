import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, normalize, sep } from "node:path";
import { createInterface } from "node:readline";
import { z } from "zod";
import type { Config } from "../config.js";

const fileInfoSchema = z.object({
  workingDirectory: z.string().describe("ワーキングディレクトリの絶対パス"),
  path: z.string().describe("対象ファイルのワーキングディレクトリからの相対パス"),
});

async function countLines(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", () => { count++; });
    rl.on("close", () => { resolve(count); });
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

export const fileTools = [
  {
    name: "file_info",
    description: "ファイルのサイズと行数を取得する",
    inputSchema: fileInfoSchema,
    handler: async (args: unknown, _config: Config) => {
      const { workingDirectory, path: filePath } = fileInfoSchema.parse(args);
      const resolved = resolve(workingDirectory, filePath);
      const normalized = normalize(resolved);

      // ワークスペース外へのアクセスを禁止
      const normalizedCwd = normalize(workingDirectory);
      if (normalized !== normalizedCwd && !normalized.startsWith(normalizedCwd + sep)) {
        return {
          content: [{ type: "text" as const, text: "エラー: ワーキングディレクトリ外のファイルにはアクセスできません" }],
          isError: true,
        };
      }

      try {
        const stats = await stat(resolved);
        const lines = stats.isFile() ? await countLines(resolved) : 0;
        const text = [
          `ファイル: ${filePath}`,
          `サイズ: ${stats.size} bytes`,
          `行数: ${lines}`,
          `種別: ${stats.isFile() ? "ファイル" : stats.isDirectory() ? "ディレクトリ" : "その他"}`,
        ].join("\n");

        return {
          content: [{ type: "text" as const, text }],
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
