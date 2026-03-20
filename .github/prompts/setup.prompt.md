---
name: setup
description: ワークスペースのドキュメントを構築するプロンプト
tools: [vscode/askQuestions, agent, todo]
model: Claude Opus 4.6 (copilot)
agent: agent
---

以下を`task`として初期化して、`/initializer`エージェントに引き渡すこと

```
本ワークスペースの詳細なドキュメントを作成すること。要件は以下の通り

### ドキュメント作成の目標
- プロジェクトの全体像を明確化し、AIエージェントが容易に理解できる状態にすること

### 記載すべき内容

1. プロジェクト概要
2. 環境情報
3. アーキテクチャ
4. クラス/モジュール仕様
5. 使用方法

### 出力形式
- Markdown形式で作成
- 図解は Mermaid、PlantUML、或いはテキスト図を使用
- ハイアラーキーに従い、見出しレベルを適切に設定
```

## ルール

- **下記フローを厳守して順次実行**すること
- 最初に`task-id`を生成し、各エージェントに通知すること。task-idは一意かつ、概要を表す英数字の文字列とすること（例: `investigate-login-system-001`、`investigate-null-pointer-002`、`investigate-auth-module-003`）
- **引数と返り値を厳守**すること。それ以外を読み取ったり、返したりしないこと

## フロー

1. **開始**: `runSubagent`ツールを用いて、/initializer エージェントにタスクを引き渡す。分割されたタスクリスト`task-filepath-array`を受け取る
1. **調査**: `runSubagent`ツールを用いて、/investigator エージェントを、`task-filepath-array`の要素ごとに**非同期・並列で**呼び出す
1. **資料**: `runSubagent`ツールを用いて、/documenter-investigate エージェントを呼び出す。

## エージェント

- **/initializer**: 引数: `task-id, task`, 返り値: `task-filepath-array`
- **/investigator**: 引数: `task-id, task-filepath`, 返り値: `investigation-result-filepath-array`
- **/documenter-investigate**: 引数: `investigation-result-filepath-array`
