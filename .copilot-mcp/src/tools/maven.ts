import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatResult } from "./format.js";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const mavenTestSchema = z.object({
  workingDirectory: workingDirectorySchema,
  testClass: z.string().optional().describe("実行するテストクラス名"),
  module: z.string().optional().describe("対象モジュール"),
});

const mavenVerifySchema = z.object({
  workingDirectory: workingDirectorySchema,
  module: z.string().optional().describe("対象モジュール"),
});

const mavenCompileSchema = z.object({
  workingDirectory: workingDirectorySchema,
  module: z.string().optional().describe("対象モジュール"),
});

const mavenCleanSchema = z.object({
  workingDirectory: workingDirectorySchema,
});



export const mavenTools = [
  {
    name: "maven_test",
    description: "Maven でテストを実行する",
    inputSchema: mavenTestSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, testClass, module } = mavenTestSchema.parse(args);
      const cmdArgs: string[] = ["test"];
      if (testClass) cmdArgs.push(`-Dtest=${testClass}`);
      if (module) cmdArgs.push("-pl", module);
      const result = await executeCommand("mvn", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "maven_verify",
    description: "Maven で verify フェーズを実行する",
    inputSchema: mavenVerifySchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, module } = mavenVerifySchema.parse(args);
      const cmdArgs: string[] = ["verify"];
      if (module) cmdArgs.push("-pl", module);
      const result = await executeCommand("mvn", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "maven_compile",
    description: "Maven でコンパイルを実行する",
    inputSchema: mavenCompileSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, module } = mavenCompileSchema.parse(args);
      const cmdArgs: string[] = ["compile"];
      if (module) cmdArgs.push("-pl", module);
      const result = await executeCommand("mvn", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "maven_clean",
    description: "Maven でクリーンを実行する",
    inputSchema: mavenCleanSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory } = mavenCleanSchema.parse(args);
      const result = await executeCommand("mvn", ["clean"], workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
];
