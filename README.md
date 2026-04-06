# Github Copilot Instructions

本リポジトリは、個人用のGithub Copilotエージェントのプロジェクト構成例と、エージェントやプロンプト、指示ファイルのテンプレートを管理するものです

## ディレクトリ構成

```text
.copilot-mcp/       # local-command MCP サーバー
.copilot-work/      # Copilot 関連の作業ファイル
.copilot-docs/      # プロジェクトドキュメント
.github/
  agents/           # エージェント定義ファイル
  instructions/     # コーディングガイドラインなどの指示ファイル
  prompts/          # プロンプト定義ファイル
.vscode/
  mcp.json          # MCP サーバー設定
.gitignore
README.md           # このファイル
```

## MCP サーバー（local-command）

VS Code Copilot エージェント向けのローカルコマンド実行 MCP（Model Context Protocol）サーバー。エージェントが構造化パラメータを渡すだけでコマンドを実行でき、生のシェルコマンドを組み立てる必要がない。

### セットアップ

1. `.copilot-mcp/` ディレクトリに移動する

   ```bash
   cd .copilot-mcp
   ```

2. 依存パッケージをインストールする

   ```bash
   npm install
   ```

3. ビルドする

   ```bash
   npm run build
   ```

`dist/index.js` が生成されれば準備完了。

### 提供ツール

| カテゴリ | ツール数 | 概要 |
| --- | --- | --- |
| Git | 11 | status, add, commit, checkout, branch, show, log, diff, fetch, pull, check-ignore |
| Maven | 4 | test, verify, compile, clean |
| Gradle | 3 | test, build, clean |
| dotnet | 5 | test, build, run, clean, restore |
| ファイルユーティリティ | 1 | ファイル情報取得 |

詳細は `.copilot-mcp/README.md` を参照。

## vscode settings.json

### 共通のコマンド自動承認

```json
"chat.tools.terminal.autoApprove": {
  "cd": true,
  "/^git (add|commit|checkout|branch|status|show|log|diff|fetch|pull|check-ignore)(\\s|$)/": true,
  "*": false
}
```

### tester エージェント用のコマンド自動承認

tester エージェントが使用する Java / C# 関連のテスト・ビルドコマンドを自動承認する設定。

```json
"chat.tools.terminal.autoApprove": {
  "cd": true,
  "/^git (add|commit|checkout|branch|status|show|log|diff|fetch|pull|check-ignore)(\\s|$)/": true,
  "/^mvn (test|verify|compile|clean)(\\s|$)/": true,
  "/^(gradle|\\.\\/gradlew) (test|build|clean)(\\s|$)/": true,
  "/^java(c)?\\s/": true,
  "/^dotnet (test|build|run|clean|restore)(\\s|$)/": true,
  "*": false
}
```
