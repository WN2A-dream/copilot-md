import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatResult } from "./format.js";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const dotnetTestSchema = z.object({
  workingDirectory: workingDirectorySchema,
  filter: z.string().optional().describe("テストフィルタ式"),
  project: z.string().optional().describe("対象プロジェクトパス"),
});

const dotnetBuildSchema = z.object({
  workingDirectory: workingDirectorySchema,
  project: z.string().optional().describe("対象プロジェクトパス"),
});

const dotnetRunSchema = z.object({
  workingDirectory: workingDirectorySchema,
  project: z.string().optional().describe("対象プロジェクトパス"),
});

const dotnetCleanSchema = z.object({
  workingDirectory: workingDirectorySchema,
  project: z.string().optional().describe("対象プロジェクトパス"),
});

const dotnetRestoreSchema = z.object({
  workingDirectory: workingDirectorySchema,
  project: z.string().optional().describe("対象プロジェクトパス"),
});



export const dotnetTools = [
  {
    name: "dotnet_test",
    description: "dotnet でテストを実行する",
    inputSchema: dotnetTestSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, filter, project } = dotnetTestSchema.parse(args);
      const cmdArgs: string[] = ["test"];
      if (project) cmdArgs.push(project);
      if (filter) cmdArgs.push("--filter", filter);
      const result = await executeCommand("dotnet", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "dotnet_build",
    description: "dotnet でビルドを実行する",
    inputSchema: dotnetBuildSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, project } = dotnetBuildSchema.parse(args);
      const cmdArgs: string[] = ["build"];
      if (project) cmdArgs.push(project);
      const result = await executeCommand("dotnet", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "dotnet_run",
    description: "dotnet でアプリケーションを実行する",
    inputSchema: dotnetRunSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, project } = dotnetRunSchema.parse(args);
      const cmdArgs: string[] = ["run"];
      if (project) cmdArgs.push("--project", project);
      const result = await executeCommand("dotnet", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "dotnet_clean",
    description: "dotnet でクリーンを実行する",
    inputSchema: dotnetCleanSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, project } = dotnetCleanSchema.parse(args);
      const cmdArgs: string[] = ["clean"];
      if (project) cmdArgs.push(project);
      const result = await executeCommand("dotnet", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "dotnet_restore",
    description: "dotnet で依存パッケージを復元する",
    inputSchema: dotnetRestoreSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, project } = dotnetRestoreSchema.parse(args);
      const cmdArgs: string[] = ["restore"];
      if (project) cmdArgs.push(project);
      const result = await executeCommand("dotnet", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
];
