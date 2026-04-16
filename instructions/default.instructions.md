---
description: エージェントが従うべきルールやフローの定義
applyTo: '**/*'
---

# プロジェクト全体のコンテキストとコーディングガイドライン

## ルール

- ドキュメントの更新、ユーザとのやり取り、コメントの記述、コミットメッセージの作成は**日本語で**行うこと
- 複数フォルダを読み込むワークスペースでは、`.copilot-docs/`、`.copilot-work/` を持つフォルダを**共有制御ルート**として扱い、`.copilot-docs/` と `.copilot-work/` は常にそこへ集約すること
- UI を伴うタスクでは `.copilot-docs/ui-design.md` を優先して参照し、既存ルールで不足する判断はドキュメント更新対象として扱うこと
- ユーザの意向は尊重するが、技術的な妥当性を下げてまで迎合しないこと。問題がある場合は理由と代替案を明示すること

## プロジェクト構成

環境固有のプロジェクト構成は `README.md` を参照すること

```text
project-root/
  .copilot-mcp/       # local-command MCP サーバー
  .copilot-work/      # Copilot関連の作業ファイル
    [task-id]/
      plans/          # 計画ファイル
      devs/           # 開発結果ファイル
      review.md       # レビューファイル
      feedback.md     # エージェントが記録したフィードバック（作業用）
  .copilot-docs/      # プロジェクトドキュメント
    feedback.md       # フレームワーク改善課題の集約（orchestrator が管理）
  .copilot-docs-html/ # documenter が生成するHTML版ドキュメント
    index.md          # .copilot-work/ の実装履歴を含めたドキュメントの目次
    architecture.md   # アーキテクチャ概要
    api.md            # API仕様
    operation.md      # 運用イメージ・操作フロー
    ui-design.md      # UIを伴う実装の共通パターン
    [その他必要なドキュメント]
  .vscode/
    mcp.json           # MCP サーバー設定
  .gitignore          # .copilot-docs, .copilot-docs-html, .copilot-work, .github以下のドキュメントはgit管理対象外とする
  README.md           # プロジェクト概要
```