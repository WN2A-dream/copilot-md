---
description: エージェントが従うべきルールやフローの定義
applyTo: '**/*'
---

# プロジェクト全体のコンテキストとコーディングガイドライン

## ルール

- ドキュメントの更新、ユーザとのやり取り、コメントの記述、コミットメッセージの作成は**日本語で**行うこと

## プロジェクト構成

環境固有のプロジェクト構成は/README.mdを参照すること

```text
project-root/
  .copilot-mcp/       # local-command MCP サーバー
  .copilot-work/      # Copilot関連の作業ファイル
    [task-id]/
      plans/          # 計画ファイル
      devs/           # 開発結果ファイル
      review.md       # レビューファイル
  .copilot-docs/      # プロジェクトドキュメント
    index.md          # .copilot-work/ の実装履歴を含めたドキュメントの目次
    architecture.md   # アーキテクチャ概要
    api.md            # API仕様
    operation.md      # 運用イメージ・操作フロー
    [その他必要なドキュメント]
  .github/
    agents/           # エージェント定義ファイル
    instructions/     # コーディングガイドラインなどの指示ファイル
    prompts/          # プロンプト定義ファイル
  .vscode/
    mcp.json           # MCP サーバー設定
  .gitignore          # .copilot-docs, .copilot-work, .github以下のドキュメントはgit管理対象外とする
  README.md           # プロジェクト概要
```