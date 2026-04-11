---
description: "MCP（local-command）ツールの使用ガイド。local-command MCPサーバー経由で git・ビルド・変換・管理領域書き込みを行う際のルールとパラメータ仕様を定義する。interviewer, investigator, planner, developer, tester, reviewer, documenter, splitter が使用する"
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
| 管理領域書き込み | `local-command/{copilot_docs_write,copilot_work_write}` | interviewer, investigator, planner, developer, tester, reviewer, documenter |
| Markdown 変換 | `local-command/md2html` | documenter |
| Maven | `local-command/maven_*` | tester |
| Gradle | `local-command/gradle_*` | tester |
| Java | `local-command/java_*` | tester |
| dotnet | `local-command/dotnet_*` | tester |
| ファイル | `local-command/file_info` | splitter, investigator |
| 構造化ファイル | `local-command/{json,xml,yaml,toml,ini}_*` | developer, tester, investigator, planner, reviewer, documenter, splitter |

## 構造化ファイル操作ツール

設定ファイルやデータファイルの構造を保持した読み書きを行う。

| ツール | 説明 | 使用エージェント |
|---|---|---|
| `json_read` | JSONファイルを読み込みパースする | developer, tester, investigator, planner, reviewer, documenter, splitter |
| `json_write` | オブジェクトをJSONとして書き込む | developer, tester |
| `json_get` | JSONPathで値を取得する | developer |
| `json_set` | JSONPathで値を設定して保存する | developer |
| `yaml_read` | YAMLファイルを読み込みパースする | developer, tester, investigator, planner, reviewer, documenter, splitter |
| `yaml_write` | オブジェクトをYAMLとして書き込む | developer, tester |
| `xml_read` | XMLファイルを読み込みパースする | developer, tester, investigator, planner, reviewer |
| `xml_write` | オブジェクトをXMLとして書き込む | developer, tester |
| `toml_read` | TOMLファイルを読み込みパースする | developer, investigator, planner, reviewer, documenter |
| `toml_write` | オブジェクトをTOMLとして書き込む | developer |
| `ini_read` | INIファイルを読み込みパースする | developer, investigator, planner, reviewer |
| `ini_write` | オブジェクトをINIとして書き込む | developer |

## Git ツール

### 読み取り専用（investigator, documenter向け）

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `git_status` | リポジトリの状態確認 | — |
| `git_log` | コミット履歴表示 | `maxCount?`, `oneline?` |
| `git_show` | コミット詳細表示 | `ref?` |
| `git_diff` | 差分表示 | `target?`, `staged?` |
| `git_check_ignore` | gitignore 判定 | `paths` |

### ブランチ・リモート操作（現在のエージェント構成では未使用）

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `git_checkout` | ブランチ切替 | `target` |
| `git_branch` | ブランチ作成/一覧 | `name?`, `list?` |
| `git_fetch` | リモート取得 | `remote?` |
| `git_pull` | リモート取り込み | `remote?`, `branch?` |

## 管理領域書き込みツール

### `.copilot-docs` / `.copilot-work` 専用

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `copilot_docs_write` | `.copilot-docs/` 配下のファイル作成・上書き | `path`, `content` |
| `copilot_work_write` | `.copilot-work/` 配下のファイル作成・上書き | `path`, `content` |

## Markdown 変換ツール

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `md2html` | Markdown ファイルまたはディレクトリを HTML 化 | `sourcePath`, `outputPath?`, `includeSearch?` |

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

### Java（ビルドツールなし）

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `java_compile` | `javac` によるコンパイル | `sourceDirectory?`, `files?`, `outputDirectory?`, `classpath?` |
| `java_run` | `java` による実行 | `mainClass`, `compiledClassesDirectory?`, `classpath?`, `args?` |

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
- `.copilot-docs/` と `.copilot-work/` にしか書き込まないエージェントは、汎用 `edit` ではなく `copilot_docs_write` / `copilot_work_write` を使用すること
- documenter は `.copilot-docs/` 更新後に `md2html` を呼び出し、`.copilot-docs-html/` を再生成すること
- Java プロジェクトに Maven / Gradle がない場合、tester は `java_compile` を最低限の検証手段として使用し、必要に応じて `java_run` を追加すること
- 複数フォルダワークスペースでは、管理領域ツールの `workingDirectory` は共有制御ルートを指定すること
