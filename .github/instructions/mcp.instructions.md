---
description: "MCP（local-command）ツールの使用ガイド。local-command MCPサーバー経由でgit/maven/gradle/dotnetコマンドを実行する際のルールとパラメータ仕様を定義する"
applyTo: '**/*'
---

# local-command MCPツール利用ガイド

## 概要

`local-command` MCPサーバーは、ターミナルコマンドの直接実行（`runInTerminal`）を置き換え、構造化パラメータ経由で安全にコマンドを実行する。

## 前提条件

利用先プロジェクトの `.vscode/mcp.json` に以下の設定が必要:

```json
{
  "servers": {
    "local-command": {
      "type": "stdio",
      "command": "node",
      "args": ["<copilot-mcpリポジトリのパス>/dist/index.js"]
    }
  }
}
```

## 共通パラメータ

全ツールに共通する `workingDirectory` パラメータ:

- **型**: `string`（必須）
- **内容**: コマンドを実行するワーキングディレクトリの**絶対パス**
- **注意**: VS Codeが開いているワークスペースのルートディレクトリを指定すること

## ツールカテゴリとエージェント割り当て

| カテゴリ | ツール名プレフィックス | 使用エージェント |
|---|---|---|
| Git | `local-command/git_*` | investigator, documenter |
| Maven | `local-command/maven_*` | tester |
| Gradle | `local-command/gradle_*` | tester |
| dotnet | `local-command/dotnet_*` | tester |
| ファイル | `local-command/file_info` | splitter |

## Git ツール

### 読み取り専用（investigator, documenter向け）

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `git_status` | リポジトリの状態確認 | — |
| `git_log` | コミット履歴表示 | `maxCount?`, `oneline?` |
| `git_show` | コミット詳細表示 | `ref?` |
| `git_diff` | 差分表示 | `target?`, `staged?` |

### 書き込み系（現在のエージェント構成では未使用）

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `git_add` | ステージング追加 | `files` |
| `git_commit` | コミット | `message` |
| `git_checkout` | ブランチ切替 | `target` |
| `git_branch` | ブランチ作成/一覧 | `name?`, `list?` |
| `git_fetch` | リモート取得 | `remote?` |
| `git_pull` | リモート取り込み | `remote?`, `branch?` |
| `git_check_ignore` | gitignore判定 | `paths` |

## ビルド/テストツール（tester向け）

### Maven

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `maven_test` | テスト実行 | `testClass?`, `module?` |
| `maven_verify` | verifyフェーズ実行 | `module?` |
| `maven_compile` | コンパイル | `module?` |
| `maven_clean` | クリーン | — |

### Gradle

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `gradle_test` | テスト実行 | `testClass?`, `module?` |
| `gradle_build` | ビルド | `module?` |
| `gradle_clean` | クリーン | — |

### dotnet

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `dotnet_test` | テスト実行 | `filter?`, `project?` |
| `dotnet_build` | ビルド | `project?` |
| `dotnet_run` | アプリ実行 | `project?` |
| `dotnet_clean` | クリーン | `project?` |
| `dotnet_restore` | パッケージ復元 | `project?` |

## レスポンス形式

全ツール共通:

- **成功時**: stdout をテキストで返却
- **エラー時**: `isError: true` + stderr を `[stderr]` プレフィックス付きで返却
- **出力なし**: `(出力なし)` を返却
- **タイムアウト**: `[タイムアウトによりプロセスを終了しました]` メッセージ付き
- **出力超過**: `[出力が上限を超えたため切り詰めました]` メッセージ付き

## 使用ルール

- `runInTerminal` / `execute` ツールは使用禁止。すべてMCPツール経由で実行すること
- 各エージェントは割り当てられたカテゴリのツールのみ使用すること
- `workingDirectory` は必ず絶対パスで指定すること
