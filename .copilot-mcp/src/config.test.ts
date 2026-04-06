import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadConfig", () => {
  it("デフォルト設定を返す（config.yamlが無い場合）", () => {
    const originalCwd = process.cwd();
    // 一時ディレクトリでconfig.yamlが無い状態をテスト
    const tmpDir = join(tmpdir(), `mcp-test-config-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);
    try {
      const config = loadConfig();
      expect(config.timeout).toBe(30000);
      expect(config.maxOutputSize).toBe(100000);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("config.yamlから設定を読み込む", () => {
    const originalCwd = process.cwd();
    const tmpDir = join(tmpdir(), `mcp-test-config-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const configPath = join(tmpDir, "config.yaml");
    writeFileSync(configPath, "timeout: 5000\nmaxOutputSize: 50000\n");
    process.chdir(tmpDir);
    try {
      const config = loadConfig();
      expect(config.timeout).toBe(5000);
      expect(config.maxOutputSize).toBe(50000);
    } finally {
      process.chdir(originalCwd);
      unlinkSync(configPath);
    }
  });

  it("不正なYAMLの場合デフォルト設定を返す", () => {
    const originalCwd = process.cwd();
    const tmpDir = join(tmpdir(), `mcp-test-config-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const configPath = join(tmpDir, "config.yaml");
    writeFileSync(configPath, "not_an_object");
    process.chdir(tmpDir);
    try {
      const config = loadConfig();
      expect(config.timeout).toBe(30000);
      expect(config.maxOutputSize).toBe(100000);
    } finally {
      process.chdir(originalCwd);
      unlinkSync(configPath);
    }
  });
});
