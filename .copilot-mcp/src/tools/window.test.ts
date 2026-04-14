import { describe, it, expect } from "vitest";
import type { Config } from "../config.js";

// Windows 環境でのみテスト実行
const isWindows = process.platform === "win32";
const describeWindows = isWindows ? describe : describe.skip;

const mockConfig: Config = { timeout: 5000, maxOutputSize: 10000 };

describeWindows("win32 API bindings", async () => {
  const { enumWindows, findWindowsByTitle } = await import("./win32.js");

  it("enumWindows が配列を返す", () => {
    const windows = enumWindows();
    expect(Array.isArray(windows)).toBe(true);
    expect(windows.length).toBeGreaterThan(0);
  });

  it("findWindowsByTitle で存在しないタイトルを検索してもエラーにならない", () => {
    const results = findWindowsByTitle(/存在しないウィンドウ12345/);
    expect(Array.isArray(results)).toBe(true);
  });
});

describeWindows("window tools", async () => {
  const { windowTools } = await import("./window.js");

  function findTool(name: string) {
    const tool = windowTools.find((t) => t.name === name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool;
  }

  it("window_list がウィンドウ一覧を返す", async () => {
    const tool = findTool("window_list");
    const result = await tool.handler({}, mockConfig);
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(Array.isArray(data)).toBe(true);
  });

  it("window_find が存在しないタイトルで空配列を返す", async () => {
    const tool = findTool("window_find");
    const result = await tool.handler(
      { titlePattern: "存在しないウィンドウ12345" },
      mockConfig,
    );
    const data = JSON.parse(result.content[0].text);
    expect(data).toEqual([]);
  });

  it("window_click が無効なHWNDでエラーを返す", async () => {
    const tool = findTool("window_click");
    try {
      await tool.handler({ windowId: 0, x: 0, y: 0 }, mockConfig);
      expect.unreachable("エラーが発生するはず");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});

describeWindows("window screenshot", async () => {
  const { screenshotTools } = await import("./window-screenshot.js");

  it("window_screenshot が無効なHWNDでエラーを返す", async () => {
    const tool = screenshotTools.find((t) => t.name === "window_screenshot");
    expect(tool).toBeDefined();
    const result = await tool!.handler({ windowId: 0 }, mockConfig);
    expect(result.isError).toBe(true);
  });
});
