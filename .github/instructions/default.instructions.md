---
description: 常に読み込むプロジェクト全体のコンテキストやコーディングガイドライン
applyTo: '**/*'
---

# プロジェクト全体のコンテキストとコーディングガイドライン

## ルール

- ドキュメントの更新、ユーザとのやり取り、コメントの記述は**日本語で**行うこと

## プロジェクト構成

環境固有のプロジェクト構成は/README.mdを参照すること

```
project-root/
  .copilot-work/      # Copilot関連の作業ファイル
    work/
      [task-id]/
        tasks/           # タスクファイル
        investigations/  # 調査結果ファイル
        plans/           # 計画ファイル
        developments/     # 開発結果ファイル
        reviews/         # レビューファイル
        evaluations/      # 評価ファイル
    docs/              # プロジェクトドキュメント
  .github/
    agents/           # エージェント定義ファイル
    instructions/     # コーディングガイドラインなどの指示ファイル
    prompts/          # プロンプト定義ファイル
  README.md           # プロジェクト概要
```