import { z } from "zod";
import type { Config } from "../config.js";
import { executeCommand } from "../executor.js";
import { formatResult } from "./format.js";

const workingDirectorySchema = z.string().describe("コマンドを実行するワーキングディレクトリの絶対パス");

const gitStatusSchema = z.object({
  workingDirectory: workingDirectorySchema,
});

const gitCheckoutSchema = z.object({
  workingDirectory: workingDirectorySchema,
  target: z.string().describe("チェックアウト対象（ブランチ名、タグ、コミットハッシュ等）"),
});

const gitBranchSchema = z.object({
  workingDirectory: workingDirectorySchema,
  name: z.string().optional().describe("作成するブランチ名"),
  list: z.boolean().optional().describe("ブランチ一覧を表示する場合 true"),
});

const gitShowSchema = z.object({
  workingDirectory: workingDirectorySchema,
  ref: z.string().optional().describe("表示する参照（コミットハッシュ等）"),
});

const gitLogSchema = z.object({
  workingDirectory: workingDirectorySchema,
  maxCount: z.number().optional().describe("表示するログの最大件数"),
  oneline: z.boolean().optional().describe("1行形式で表示する場合 true"),
});

const gitDiffSchema = z.object({
  workingDirectory: workingDirectorySchema,
  target: z.string().optional().describe("diff対象（ブランチ名、コミットハッシュ等）"),
  staged: z.boolean().optional().describe("ステージング済みの差分を表示する場合 true"),
});

const gitFetchSchema = z.object({
  workingDirectory: workingDirectorySchema,
  remote: z.string().optional().describe("リモート名"),
});

const gitPullSchema = z.object({
  workingDirectory: workingDirectorySchema,
  remote: z.string().optional().describe("リモート名"),
  branch: z.string().optional().describe("ブランチ名"),
});

const gitCheckIgnoreSchema = z.object({
  workingDirectory: workingDirectorySchema,
  paths: z.array(z.string()).describe("チェック対象のパス配列"),
});



export const gitTools = [
  {
    name: "git_status",
    description: "Git リポジトリのステータスを表示する",
    inputSchema: gitStatusSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory } = gitStatusSchema.parse(args);
      const result = await executeCommand("git", ["status"], workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_checkout",
    description: "ブランチやコミットをチェックアウトする",
    inputSchema: gitCheckoutSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, target } = gitCheckoutSchema.parse(args);
      if (target.startsWith("-")) {
        return { content: [{ type: "text" as const, text: "エラー: ハイフンで始まるターゲットは指定できません" }], isError: true };
      }
      const result = await executeCommand("git", ["checkout", target], workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_branch",
    description: "ブランチの作成または一覧表示を行う",
    inputSchema: gitBranchSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, name, list } = gitBranchSchema.parse(args);
      const cmdArgs: string[] = ["branch"];
      if (list) {
        cmdArgs.push("--list");
      } else if (name) {
        cmdArgs.push(name);
      }
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_show",
    description: "コミットの詳細情報を表示する",
    inputSchema: gitShowSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, ref } = gitShowSchema.parse(args);
      const cmdArgs: string[] = ["show"];
      if (ref) cmdArgs.push(ref);
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_log",
    description: "コミットログを表示する",
    inputSchema: gitLogSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, maxCount, oneline } = gitLogSchema.parse(args);
      const cmdArgs: string[] = ["log"];
      if (oneline) cmdArgs.push("--oneline");
      if (maxCount !== undefined) cmdArgs.push("-n", String(maxCount));
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_diff",
    description: "差分を表示する",
    inputSchema: gitDiffSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, target, staged } = gitDiffSchema.parse(args);
      const cmdArgs: string[] = ["diff"];
      if (staged) cmdArgs.push("--staged");
      if (target) cmdArgs.push(target);
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_fetch",
    description: "リモートリポジトリから最新情報を取得する",
    inputSchema: gitFetchSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, remote } = gitFetchSchema.parse(args);
      const cmdArgs: string[] = ["fetch"];
      if (remote) cmdArgs.push(remote);
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_pull",
    description: "リモートリポジトリから変更を取得してマージする",
    inputSchema: gitPullSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, remote, branch } = gitPullSchema.parse(args);
      const cmdArgs: string[] = ["pull"];
      if (remote) cmdArgs.push(remote);
      if (branch) cmdArgs.push(branch);
      const result = await executeCommand("git", cmdArgs, workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
  {
    name: "git_check_ignore",
    description: "指定パスが .gitignore で無視されるかチェックする",
    inputSchema: gitCheckIgnoreSchema,
    handler: async (args: unknown, config: Config) => {
      const { workingDirectory, paths } = gitCheckIgnoreSchema.parse(args);
      const result = await executeCommand("git", ["check-ignore", "--", ...paths], workingDirectory, config.timeout, config.maxOutputSize);
      return formatResult(result);
    },
  },
];
