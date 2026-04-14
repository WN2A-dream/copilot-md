import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatBuildResult } from "./format.js";
import { parseNpmErrors } from "./parsers.js";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const npmInstallSchema = z.object({
  workingDirectory: workingDirectorySchema,
  args: z.array(z.string()).optional().describe("npm install に渡す追加引数"),
});

const npmBuildSchema = z.object({
  workingDirectory: workingDirectorySchema,
  script: z.string().optional().describe("実行するビルドスクリプト名。省略時は build"),
});

const npmTestSchema = z.object({
  workingDirectory: workingDirectorySchema,
  args: z.array(z.string()).optional().describe("テストに渡す追加引数（-- 以降に追加される）"),
});

const npmRunSchema = z.object({
  workingDirectory: workingDirectorySchema,
  script: z.string().describe("実行するスクリプト名"),
  args: z.array(z.string()).optional().describe("スクリプトに渡す引数"),
});

const npmDependenciesSchema = z.object({
  workingDirectory: workingDirectorySchema,
  depth: z.number().optional().describe("表示する依存関係の深さ。省略時は全階層"),
});

export const npmTools = [
  {
    name: "npm_install",
    description: "npm で依存パッケージをインストールする",
    inputSchema: npmInstallSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, args: installArgs } = npmInstallSchema.parse(args);
      const cmdArgs: string[] = ["install"];
      if (installArgs) cmdArgs.push(...installArgs);
      const result = await executeCommand(npmCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      const errors = parseNpmErrors(combined);
      return formatBuildResult(result, errors);
    },
  },
  {
    name: "npm_build",
    description: "npm でビルドスクリプトを実行する",
    inputSchema: npmBuildSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, script } = npmBuildSchema.parse(args);
      const cmdArgs: string[] = ["run", script ?? "build"];
      const result = await executeCommand(npmCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      const errors = parseNpmErrors(combined);
      return formatBuildResult(result, errors);
    },
  },
  {
    name: "npm_test",
    description: "npm でテストを実行する",
    inputSchema: npmTestSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, args: testArgs } = npmTestSchema.parse(args);
      const cmdArgs: string[] = ["test"];
      if (testArgs && testArgs.length > 0) cmdArgs.push("--", ...testArgs);
      const result = await executeCommand(npmCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      const errors = parseNpmErrors(combined);
      return formatBuildResult(result, errors);
    },
  },
  {
    name: "npm_run",
    description: "npm で任意のスクリプトを実行する",
    inputSchema: npmRunSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, script, args: scriptArgs } = npmRunSchema.parse(args);
      const cmdArgs: string[] = ["run", script];
      if (scriptArgs && scriptArgs.length > 0) cmdArgs.push("--", ...scriptArgs);
      const result = await executeCommand(npmCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      const errors = parseNpmErrors(combined);
      return formatBuildResult(result, errors);
    },
  },
  {
    name: "npm_dependencies",
    description: "npm で依存関係ツリーを JSON 形式で表示する",
    inputSchema: npmDependenciesSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, depth } = npmDependenciesSchema.parse(args);
      const cmdArgs: string[] = ["ls", "--json"];
      if (depth !== undefined) cmdArgs.push(`--depth=${depth}`);
      const result = await executeCommand(npmCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      const errors = parseNpmErrors(combined);
      return formatBuildResult(result, errors);
    },
  },
];
