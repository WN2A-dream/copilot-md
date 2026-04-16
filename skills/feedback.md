# スキル: フィードバック（Feedback）

## 目的

エージェント実行中に遭遇した **フレームワーク（.copilot）の能力不足** を検出・記録し、`.copilot-docs/feedback.md` に集約する。
ユーザはこのファイルを確認し、`.copilot` への反映や Issue 化を行う。

## 適用条件

すべてのリーフエージェントがタスク完了時に評価を行う。
障害に遭遇した時点で即座に記録してもよい。

## 評価基準

タスク実行中に以下の観点で過不足を評価する。**問題がなければ記録不要**。

| カテゴリ | 評価内容 | 例 |
|---|---|---|
| `mcp-tool` | 必要な MCP ツールが存在しないか、機能が不足している | `git_commit` が存在しない、`json_set` のクエリ構文が不十分 |
| `permission` | ツールは存在するが、自エージェントに割り当てられていない | investigator に `copilot_docs_write` がない |
| `information` | 利用可能なツールでは必要な情報を取得できない | ファイルの最終更新日時が取れない、依存関係の推移的解決ができない |
| `operation` | 必要な編集・操作ができない | 特定形式のファイルを構造的に編集できない、バイナリファイルを扱えない |
| `workflow` | エージェントのフロー・ルール上の制約で作業が阻害された | 並列実行すべき箇所が逐次になっている、不要な確認ゲートがある |

## 記録方法

### リーフエージェント

タスク完了時（出力ファイル書き込みの直後）に評価を行い、課題があれば `.copilot-work/{task_id}/feedback.md` に追記する。

```pseudo
function record_feedback(task_id, agent_name, items):
  if items.is_empty():
    return

  existing = read_if_exists(".copilot-work/{task_id}/feedback.md")
  new_content = existing + format_feedback_entries(agent_name, items)
  call local-command/copilot_work_write(
    workingDirectory,
    path="{task_id}/feedback.md",
    content=new_content
  )
```

### Orchestrator（集約）

タスク完了後に `.copilot-work/{task_id}/feedback.md` を読み取り、`.copilot-docs/feedback.md` にマージする。

## 記録フォーマット

### `.copilot-work/{task_id}/feedback.md`（作業用）

```md
# フィードバック

| カテゴリ | 報告元 | 概要 | 詳細 |
|---|---|---|---|
| mcp-tool | investigator | git_stash が利用不可 | 調査中に一時退避が必要だったが対応するツールがない |
| permission | developer | copilot_docs_write 未割当 | ドキュメント修正も含む計画だったが直接書き込めなかった |
```

### `.copilot-docs/feedback.md`（集約先）

```md
# フィードバック

エージェント実行中に検出されたフレームワーク改善課題。
ユーザはこのファイルを確認し、`.copilot` への反映や Issue 化を行う。

## 未解決

| ID | カテゴリ | 報告元 | タスクID | 概要 | 詳細 | 報告日 |
|---|---|---|---|---|---|---|
| F-001 | mcp-tool | investigator | task-xxx | git_stash が利用不可 | 調査中に一時退避が必要だったが対応するツールがない | 2026-04-16 |

## 解決済み

| ID | カテゴリ | 報告元 | タスクID | 概要 | 詳細 | 報告日 | 解決日 |
|---|---|---|---|---|---|---|---|

（ユーザが未解決から手動で移動する）
```

## 重複排除

同一概要の課題が既に `.copilot-docs/feedback.md` に存在する場合は追記しない。
タスクIDが異なっていても、概要が実質同一であればスキップする。

## 注意

- フィードバックは **フレームワーク自体の改善課題** のみを対象とする。タスク固有の技術的問題（コンパイルエラー等）は対象外
- 問題がなければ何も記録しない（ノイズ防止）
- 些細な不便ではなく、**タスク遂行を阻害した、または回避策が必要だった** 課題を記録する
