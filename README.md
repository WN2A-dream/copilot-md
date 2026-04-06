# Github Copilot Instructions

本リポジトリは、個人用のGithub Copilotエージェントのプロジェクト構成例と、エージェントやプロンプト、指示ファイルのテンプレートを管理するものです

## ディレクトリ構成

```text
.copilot-mcp/       # local-command MCP サーバー
.copilot-work/      # Copilot 関連の作業ファイル
  [task-id]/
    plans/          # 計画ファイル
    devs/           # 開発結果ファイル
    review.md       # レビューファイル
.copilot-docs/      # プロジェクトドキュメント
.github/
  agents/           # エージェント定義ファイル
  instructions/     # コーディングガイドラインなどの指示ファイル
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
