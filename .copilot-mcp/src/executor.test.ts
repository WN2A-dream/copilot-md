import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeCommand } from "./executor.js";

describe("executeCommand", () => {
  it("正常なコマンドを実行して結果を返す", async () => {
    // node -e でシンプルなコマンドをテスト（クロスプラットフォーム）
    const result = await executeCommand(
      "node",
      ["-e", 'console.log("hello")'],
      process.cwd(),
      5000,
      10000,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.stderr).toBe("");
    expect(result.truncated).toBe(false);
    expect(result.timedOut).toBe(false);
  });

  it("存在しないコマンドでエラーを返す", async () => {
    const result = await executeCommand(
      "nonexistent_command_12345",
      [],
      process.cwd(),
      5000,
      10000,
    );
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toBeTruthy();
  });

  it("stderr出力を捕捉する", async () => {
    const result = await executeCommand(
      "node",
      ["-e", 'console.error("err msg")'],
      process.cwd(),
      5000,
      10000,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr.trim()).toBe("err msg");
  });

  it("非ゼロ終了コードを返す", async () => {
    const result = await executeCommand(
      "node",
      ["-e", "process.exit(42)"],
      process.cwd(),
      5000,
      10000,
    );
    expect(result.exitCode).toBe(42);
  });

  it("タイムアウト時にプロセスを終了する", async () => {
    const result = await executeCommand(
      "node",
      ["-e", "setTimeout(() => {}, 60000)"],
      process.cwd(),
      500, // 短いタイムアウト
      10000,
    );
    expect(result.timedOut).toBe(true);
  });

  it("出力が上限を超えた場合に切り詰める", async () => {
    const result = await executeCommand(
      "node",
      ["-e", 'process.stdout.write("x".repeat(500))'],
      process.cwd(),
      5000,
      100, // 小さい上限
    );
    expect(result.truncated).toBe(true);
    // 切り詰めメッセージを除いた出力が上限以内
    const mainOutput = result.stdout.split("\n[出力が上限を超えたため切り詰めました]")[0];
    expect(mainOutput.length).toBeLessThanOrEqual(100);
  });
});
