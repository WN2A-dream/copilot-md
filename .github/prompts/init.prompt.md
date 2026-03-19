---
name: init
description: ワークスペースのドキュメントを構築するプロンプト
tools: [vscode/askQuestions, agent, todo]
model: Claude Opus 4.6 (copilot)
agent: agent
---

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
