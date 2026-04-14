import { mkdir, readdir } from "node:fs/promises";
import { normalize, resolve, sep } from "node:path";
import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatBuildResult } from "./format.js";
import { parseJavacErrors } from "./parsers.js";

const classpathSeparator = process.platform === "win32" ? ";" : ":";
const defaultOutputDirectory = ".copilot-work/java-classes";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const javaCompileSchema = z.object({
  workingDirectory: workingDirectorySchema,
  sourceDirectory: z.string().optional().describe("Javaソースのルートディレクトリ。省略時はワークスペース全体を探索"),
  files: z.array(z.string()).optional().describe("コンパイル対象の相対ファイルパス配列。省略時は sourceDirectory 配下を探索"),
  outputDirectory: z.string().optional().describe("コンパイル済みクラスの出力先。省略時は .copilot-work/java-classes"),
  classpath: z.string().optional().describe("追加クラスパス"),
});

const javaRunSchema = z.object({
  workingDirectory: workingDirectorySchema,
  mainClass: z.string().describe("実行するメインクラス"),
  compiledClassesDirectory: z.string().optional().describe("コンパイル済みクラスの配置先。省略時は .copilot-work/java-classes"),
  classpath: z.string().optional().describe("追加クラスパス"),
  args: z.array(z.string()).optional().describe("main メソッドに渡す引数"),
});

function ensureWithinWorkspace(workingDirectory: string, relativePath: string, label: string): string {
  const resolved = resolve(workingDirectory, relativePath);
  const normalized = normalize(resolved);
  const normalizedCwd = normalize(workingDirectory);

  if (normalized !== normalizedCwd && !normalized.startsWith(normalizedCwd + sep)) {
    throw new Error(`${label}はワーキングディレクトリ内を指定してください`);
  }

  return normalized;
}

async function collectJavaFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectJavaFiles(entryPath);
    }
    if (entry.isFile() && entry.name.endsWith(".java")) {
      return [entryPath];
    }
    return [];
  }));

  return nested.flat().sort();
}

export const javaTools = [
  {
    name: "java_compile",
    description: "ビルドツールを使わずに Java ソースを javac でコンパイルする",
    inputSchema: javaCompileSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, sourceDirectory, files, outputDirectory, classpath } = javaCompileSchema.parse(args);
      const resolvedOutputDirectory = ensureWithinWorkspace(workingDirectory, outputDirectory ?? defaultOutputDirectory, "出力先");

      let sourceFiles: string[];
      if (files && files.length > 0) {
        sourceFiles = files.map((filePath) => ensureWithinWorkspace(workingDirectory, filePath, "ソースファイル"));
      } else {
        const sourceRoot = ensureWithinWorkspace(workingDirectory, sourceDirectory ?? ".", "ソースディレクトリ");
        sourceFiles = await collectJavaFiles(sourceRoot);
      }

      if (sourceFiles.length === 0) {
        return {
          content: [{ type: "text" as const, text: "エラー: コンパイル対象の Java ファイルが見つかりません" }],
          isError: true,
        };
      }

      await mkdir(resolvedOutputDirectory, { recursive: true });

      const commandArgs = ["-d", resolvedOutputDirectory];
      if (classpath) {
        commandArgs.push("-cp", classpath);
      }
      commandArgs.push(...sourceFiles);

      const result = await executeCommand("javac", commandArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatBuildResult(result, parseJavacErrors(result.stderr));
    },
  },
  {
    name: "java_run",
    description: "ビルドツールを使わずに Java クラスを実行する",
    inputSchema: javaRunSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, mainClass, compiledClassesDirectory, classpath, args: programArgs } = javaRunSchema.parse(args);
      const resolvedClassesDirectory = ensureWithinWorkspace(
        workingDirectory,
        compiledClassesDirectory ?? defaultOutputDirectory,
        "クラス出力先",
      );

      const commandArgs = ["-cp", classpath ? `${resolvedClassesDirectory}${classpathSeparator}${classpath}` : resolvedClassesDirectory, mainClass];
      if (programArgs) {
        commandArgs.push(...programArgs);
      }

      const result = await executeCommand("java", commandArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatBuildResult(result, []);
    },
  },
];