# Github Copilot Instructions

本リポジトリは、個人用のGithub Copilotエージェントのプロジェクト構成例と、エージェントやプロンプト、指示ファイルのテンプレートを管理するものです

## ディレクトリ構成

```txt
.github/
  agents/           # エージェント定義ファイル
  instructions/     # コーディングガイドラインなどの指示ファイル
  prompts/          # プロンプト定義ファイル
README.md           # このファイル
```

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
