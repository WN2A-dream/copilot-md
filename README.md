# Github Copilot Instructions

本リポジトリは、個人用のGithub Copilotエージェントのプロジェクト構成例と、エージェントやプロンプト、指示ファイルのテンプレートを管理するものです
本プロジェクトは、`C:/Users/[ユーザ名]/.copilot/` 以下に配置しているため、agent、instructionsは各ワークスペースで自動で読み込まれます。
また、ユーザ設定の`mcp.json`でMCPサーバーの設定を行っているため、`.copilot-mcp/`以下のサーバーも自動で利用可能になります。

複数フォルダを読み込むワークスペースでは、`.copilot-docs` フォルダを共有制御ルートとして扱い、`.copilot-docs/`、`.copilot-docs-html/`、`.copilot-work/`、`README.md` をここへ集約します。

## ディレクトリ構成

```text
.copilot-mcp/       # local-command MCP サーバー
.copilot-work/      # Copilot 関連の作業ファイル
  [task-id]/
    plans/          # 計画ファイル
    devs/           # 開発結果ファイル
    review.md       # レビューファイル
.copilot-docs/      # プロジェクトドキュメント
.copilot-docs-html/ # .copilot-docs/ をHTML化した閲覧用ドキュメント
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
| Git | 9 | status, checkout, branch, show, log, diff, fetch, pull, check-ignore |
| 管理領域書き込み | 2 | `.copilot-docs/` と `.copilot-work/` 専用の書き込み |
| Markdown | 1 | Markdown を検索 UI 付き HTML へ変換 |
| Maven | 4 | test, verify, compile, clean |
| Gradle | 3 | test, build, clean |
| Java | 2 | build tool なしの `javac` / `java` 実行 |
| dotnet | 5 | test, build, run, clean, restore |
| ファイルユーティリティ | 1 | ファイル情報取得 |

documenter は `.copilot-docs/` 更新後に `.copilot-docs-html/` を再生成し、HTML 側でページ内検索と資料一覧検索を利用できるようにします。

## mcp設定

VS Code の `.vscode/mcp.json` で MCP サーバーの設定を行います。以下は例です。

```json
{
  "servers": [
    {
      "name": "local-command",
      "command": "node",
      "args": ["C:/Users/[ユーザ名]/.copilot/.copilot-mcp/dist/index.js"],
      "port": 5000
    }
  ]
}
```
