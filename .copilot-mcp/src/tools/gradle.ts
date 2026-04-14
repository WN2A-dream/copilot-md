import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatBuildResult } from "./format.js";
import { parseGradleErrors, parseGradleTestSummary } from "./parsers.js";

const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const gradleTestSchema = z.object({
  workingDirectory: workingDirectorySchema,
  testClass: z.string().optional().describe("実行するテストクラス名"),
  module: z.string().optional().describe("対象モジュール名"),
});

const gradleBuildSchema = z.object({
  workingDirectory: workingDirectorySchema,
  module: z.string().optional().describe("対象モジュール名"),
});

const gradleCleanSchema = z.object({
  workingDirectory: workingDirectorySchema,
});

const gradleDependenciesSchema = z.object({
  workingDirectory: workingDirectorySchema,
  module: z.string().optional().describe("対象モジュール名"),
  configuration: z.string().optional().describe("依存関係の構成名（例: implementation, compileClasspath）"),
});



export const gradleTools = [
  {
    name: "gradle_test",
    description: "Gradle でテストを実行する",
    inputSchema: gradleTestSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, testClass, module } = gradleTestSchema.parse(args);
      let task = "test";
      if (module) task = `:${module}:test`;
      const cmdArgs: string[] = [task];
      if (testClass) cmdArgs.push("--tests", testClass);
      const result = await executeCommand(gradleCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      return formatBuildResult(result, parseGradleErrors(combined), parseGradleTestSummary(combined));
    },
  },
  {
    name: "gradle_build",
    description: "Gradle でビルドを実行する",
    inputSchema: gradleBuildSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, module } = gradleBuildSchema.parse(args);
      let task = "build";
      if (module) task = `:${module}:build`;
      const result = await executeCommand(gradleCommand, [task], workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      return formatBuildResult(result, parseGradleErrors(combined));
    },
  },
  {
    name: "gradle_clean",
    description: "Gradle でクリーンを実行する",
    inputSchema: gradleCleanSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory } = gradleCleanSchema.parse(args);
      const result = await executeCommand(gradleCommand, ["clean"], workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      return formatBuildResult(result, parseGradleErrors(combined));
    },
  },
  {
    name: "gradle_dependencies",
    description: "Gradle で依存関係ツリーを表示する",
    inputSchema: gradleDependenciesSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, module, configuration } = gradleDependenciesSchema.parse(args);
      let task = "dependencies";
      if (module) task = `:${module}:dependencies`;
      const cmdArgs: string[] = [task];
      if (configuration) cmdArgs.push("--configuration", configuration);
      const result = await executeCommand(gradleCommand, cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
      return formatBuildResult(result, parseGradleErrors(combined));
    },
  },
];
