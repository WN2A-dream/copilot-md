import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { z } from "zod";
import koffi from "koffi";
import type { Config } from "../config.js";
import { win32, toHwnd } from "./win32.js";

// ── 定数 ──

const PW_CLIENTONLY = 1;
const PW_RENDERFULLCONTENT = 2;
const SRCCOPY = 0x00cc0020;
const DIB_RGB_COLORS = 0;

// ── スキーマ ──

const windowScreenshotSchema = z.object({
  windowId: z.number().describe("対象ウィンドウの HWND 値"),
  outputPath: z.string().optional().describe("PNG保存先パス。省略時は base64 画像として返却"),
});

// ── BGRA → PNG 変換 ──

function bgraToPng(pixelData: Buffer, width: number, height: number): Buffer {
  const png = new PNG({ width, height });

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    png.data[offset + 0] = pixelData[offset + 2]!; // R ← B
    png.data[offset + 1] = pixelData[offset + 1]!; // G ← G
    png.data[offset + 2] = pixelData[offset + 0]!; // B ← R
    png.data[offset + 3] = 255;                     // A
  }

  return PNG.sync.write(png);
}

// ── スクリーンショット取得 ──

function captureWindow(hwndValue: number): { pngBuffer: Buffer; width: number; height: number } {
  const hwnd = toHwnd(hwndValue);

  // HWND 有効性チェック
  if (!win32.IsWindow(hwnd)) {
    throw new Error(`無効なウィンドウハンドル: ${hwndValue}`);
  }

  // クライアント領域サイズ取得
  const rect = { left: 0, top: 0, right: 0, bottom: 0 };
  win32.GetClientRect(hwnd, rect);
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  if (width <= 0 || height <= 0) {
    throw new Error(`ウィンドウのクライアント領域が空です (${width}x${height})`);
  }

  // GDI リソース作成
  const hdcWindow = win32.GetDC(hwnd);
  if (!hdcWindow) {
    throw new Error("GetDC に失敗しました");
  }

  const hdcMem = win32.CreateCompatibleDC(hdcWindow);
  const hBitmap = win32.CreateCompatibleBitmap(hdcWindow, width, height);
  let oldBitmap: unknown;

  try {
    oldBitmap = win32.SelectObject(hdcMem, hBitmap);

    // PrintWindow でキャプチャ（フォールバック: BitBlt）
    const pwResult = win32.PrintWindow(hwnd, hdcMem, PW_CLIENTONLY | PW_RENDERFULLCONTENT);
    if (!pwResult) {
      win32.BitBlt(hdcMem, 0, 0, width, height, hdcWindow, 0, 0, SRCCOPY);
    }

    // ピクセルデータ取得
    const bmi = {
      biSize: koffi.sizeof(win32.BITMAPINFOHEADER),
      biWidth: width,
      biHeight: -height, // top-down DIB
      biPlanes: 1,
      biBitCount: 32,
      biCompression: 0,
      biSizeImage: 0,
      biXPelsPerMeter: 0,
      biYPelsPerMeter: 0,
      biClrUsed: 0,
      biClrImportant: 0,
    };

    const bufferSize = width * height * 4;
    const pixelBuffer = Buffer.alloc(bufferSize);

    const scanLines = win32.GetDIBits(hdcWindow, hBitmap, 0, height, pixelBuffer, bmi, DIB_RGB_COLORS);
    if (scanLines === 0) {
      throw new Error("GetDIBits に失敗しました");
    }

    // PNG 変換
    const pngBuffer = bgraToPng(pixelBuffer, width, height);
    return { pngBuffer, width, height };
  } finally {
    win32.SelectObject(hdcMem, oldBitmap);
    win32.DeleteObject(hBitmap);
    win32.DeleteDC(hdcMem);
    win32.ReleaseDC(hwnd, hdcWindow);
  }
}

// ── ツール定義 ──

export const screenshotTools = [
  {
    name: "window_screenshot",
    description: "指定ウィンドウのスクリーンショットを取得する（PrintWindow + PNG変換）",
    inputSchema: windowScreenshotSchema,
    handler: async (args: unknown, _config: Config) => {
      const { windowId, outputPath } = windowScreenshotSchema.parse(args);

      try {
        const { pngBuffer, width, height } = captureWindow(windowId);

        if (outputPath) {
          writeFileSync(outputPath, pngBuffer);
          return {
            content: [{ type: "text" as const, text: `スクリーンショットを保存しました: ${outputPath}` }],
          };
        }

        const base64 = pngBuffer.toString("base64");
        return {
          content: [
            { type: "image" as const, data: base64, mimeType: "image/png" },
            { type: "text" as const, text: `スクリーンショット取得完了 (${width}x${height})` },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `スクリーンショットエラー: ${message}` }],
          isError: true,
        };
      }
    },
  },
];
