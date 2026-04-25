---
description: "MCP（local-command）ツールの使用ガイド。local-command MCPサーバー経由で git・ビルド・変換・管理領域操作を行う際のルールとパラメータ仕様を定義する"
---

# local-command MCPツール利用ガイド

## 概要

`local-command` MCPサーバーは、ターミナルコマンドの直接実行（`runInTerminal`）を置き換え、構造化パラメータ経由で安全にコマンドを実行する。

## 共通パラメータ

全ツールに共通する `workingDirectory` パラメータ:

- **型**: `string`（必須）
- **内容**: コマンドを実行するワーキングディレクトリの**絶対パス**
- **注意**: VS Codeが開いているワークスペースのルートディレクトリを指定すること

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

## 管理領域ツール

### `.copilot-docs` / `.copilot-work` 専用

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `copilot_docs_read` | `.copilot-docs/` 配下のファイル読み込み | `path` |
| `copilot_docs_write` | `.copilot-docs/` 配下のファイル作成・上書き | `path`, `content` |
| `copilot_work_read` | `.copilot-work/` 配下のファイル読み込み | `path` |
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

### npm

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `npm_install` | npm install を実行 | `args?` |
| `npm_build` | npm run build（またはカスタムスクリプト）を実行 | `script?` |
| `npm_test` | npm test を実行 | `args?` |
| `npm_run` | 任意の npm スクリプトを実行 | `script` |
| `npm_dependencies` | npm の依存関係ツリーを JSON で取得 | `depth?` |

### 依存関係取得

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `maven_dependencies` | Maven の依存関係ツリーを取得 | `module?` |
| `gradle_dependencies` | Gradle の依存関係ツリーを取得 | `module?`, `configuration?` |
| `dotnet_dependencies` | dotnet のパッケージ一覧を取得 | `project?` |

## レスポンス形式

### 汎用ツール

全ツール共通:

- **成功時**: stdout をテキストで返却
- **エラー時**: `isError: true` + stderr を `[stderr]` プレフィックス付きで返却
- **出力なし**: `(出力なし)` を返却
- **タイムアウト**: `[タイムアウトによりプロセスを終了しました]` メッセージ付き
- **出力超過**: `[出力が上限を超えたため切り詰めました]` メッセージ付き

### ビルド/テストツール（構造化 BuildResult）

全ビルドツール（`maven_*`, `gradle_*`, `java_*`, `dotnet_*`, `npm_*`）は構造化 JSON（BuildResult 形式）で結果を返却する。

BuildResult の主要フィールド:

| フィールド | 型 | 説明 |
|---|---|---|
| `success` | `boolean` | ビルド成功/失敗 |
| `exitCode` | `number \| null` | 終了コード |
| `errors` | `Array<{ file?, line?, column?, severity, message }>` | パース済みエラー |
| `testSummary` | `{ testsRun, testsPassed, testsFailed, testsSkipped }?` | テスト結果 |
| `rawOutput` | `string` | 生出力 |

## ウィンドウ操作ツール（Windows 限定）

起動済みウィンドウに対してスクリーンショット取得・クリック・キー入力を行う。
操作は指定ウィンドウのクライアント領域内に制限され、範囲外操作はエラーとなる。

| ツール | 用途 | 主要パラメータ |
|---|---|---|
| `window_find` | タイトル/プロセス名でウィンドウ検索 | `titlePattern`, `processName?` |
| `window_list` | 表示中ウィンドウ一覧取得 | — |
| `window_info` | ウィンドウ詳細情報取得 | `windowId` |
| `window_click` | ウィンドウ内クリック | `windowId`, `x`, `y`, `button?`, `doubleClick?` |
| `window_type` | テキスト入力 | `windowId`, `text` |
| `window_key` | キー入力（修飾キー対応） | `windowId`, `key`, `modifiers?` |
| `window_screenshot` | スクリーンショット取得 | `windowId`, `outputPath?` |

### 使い方の流れ

1. `window_find` または `window_list` でウィンドウを特定し `windowId`（HWND）を取得
2. `window_info` でサイズ・位置を確認
3. `window_screenshot` で現在の画面を取得
4. `window_click` / `window_type` / `window_key` で操作
5. 再度 `window_screenshot` で結果を確認

### 注意事項

- 座標はクライアント領域の左上を原点 (0,0) とする
- `window_screenshot` で `outputPath` を省略すると base64 画像として返却される

## 使用ルール

- `runInTerminal` / `execute` ツールは使用禁止。すべてMCPツール経由で実行すること
- 各エージェントは割り当てられたカテゴリのツールのみ使用すること
- `workingDirectory` は必ず絶対パスで指定すること
- `.copilot-docs/` と `.copilot-work/` にしか書き込まないエージェントは、汎用 `edit` ではなく `copilot_docs_write` / `copilot_work_write` を使用すること
- documenter は `.copilot-docs/` 更新後に `md2html` を呼び出し、`.copilot-docs-html/` を再生成すること
- Java プロジェクトに Maven / Gradle がない場合、tester は `java_compile` を最低限の検証手段として使用し、必要に応じて `java_run` を追加すること
- 複数フォルダワークスペースでは、管理領域ツールの `workingDirectory` は共有制御ルートを指定すること
