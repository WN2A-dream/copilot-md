import { z } from "zod";
import type { Config } from "../config.js";
import {
  toHwnd,
  enumWindows,
  findWindowsByTitle,
  getWindowRect,
  getClientRectScreen,
  validateCoordinates,
  getProcessName,
  getWindowTitle,
  getWindowClassName,
  getWindowPid,
  win32,
  type HwndValue,
  type WindowRect,
} from "./win32.js";

// ── 共通スキーマ ──

const windowIdSchema = z
  .number()
  .describe(
    "操作対象ウィンドウの HWND 値（window_find / window_list で取得）",
  );

// ── ヘルパー関数 ──

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertValidWindow(hwnd: HwndValue): void {
  if (!win32.IsWindow(toHwnd(hwnd))) {
    throw new Error(`無効なウィンドウハンドル: ${hwnd}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── WM 定数 ──

const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const WM_CHAR = 0x0102;

const WM_LBUTTONDOWN = 0x0201;
const WM_LBUTTONUP = 0x0202;
const WM_LBUTTONDBLCLK = 0x0203;
const WM_RBUTTONDOWN = 0x0204;
const WM_RBUTTONUP = 0x0205;
const WM_RBUTTONDBLCLK = 0x0206;
const WM_MBUTTONDOWN = 0x0207;
const WM_MBUTTONUP = 0x0208;
const WM_MBUTTONDBLCLK = 0x0209;

// MK_* flags for wParam
const MK_LBUTTON = 0x0001;
const MK_RBUTTON = 0x0002;
const MK_MBUTTON = 0x0010;

// ── 仮想キーコードマッピング ──

const VK_MAP: Record<string, number> = {
  enter: 0x0d,
  return: 0x0d,
  escape: 0x1b,
  esc: 0x1b,
  tab: 0x09,
  space: 0x20,
  backspace: 0x08,
  delete: 0x2e,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  f1: 0x70,
  f2: 0x71,
  f3: 0x72,
  f4: 0x73,
  f5: 0x74,
  f6: 0x75,
  f7: 0x76,
  f8: 0x77,
  f9: 0x78,
  f10: 0x79,
  f11: 0x7a,
  f12: 0x7b,
};

// 0-9 keys
for (let i = 0; i <= 9; i++) {
  VK_MAP[String(i)] = 0x30 + i;
}

const VK_CONTROL = 0x11;
const VK_MENU = 0x12;
const VK_SHIFT = 0x10;
const MAPVK_VK_TO_VSC = 0;

// 拡張キー（bit 24 フラグが必要なキー）
const EXTENDED_VK_KEYS = new Set([
  0x21, // VK_PRIOR (PageUp)
  0x22, // VK_NEXT (PageDown)
  0x23, // VK_END
  0x24, // VK_HOME
  0x25, // VK_LEFT
  0x26, // VK_UP
  0x27, // VK_RIGHT
  0x28, // VK_DOWN
  0x2d, // VK_INSERT
  0x2e, // VK_DELETE
]);

function resolveVirtualKey(key: string): number {
  const lower = key.toLowerCase();
  if (VK_MAP[lower] !== undefined) return VK_MAP[lower];

  // Single character: use VkKeyScanW
  if (key.length === 1) {
    const result = win32.VkKeyScanW(key);
    const vk = result & 0xff;
    if (vk !== 0xff) return vk;
  }

  throw new Error(`未対応のキー: ${key}`);
}

function makeLParam(vk: number, scanCode: number, isUp: boolean): number {
  // bits 0-15: repeat count (1)
  // bits 16-23: scan code
  // bit 24: extended key flag
  // bit 30: previous key state (1 for up)
  // bit 31: transition state (1 for up)
  let lp = 1 | (scanCode << 16);
  if (EXTENDED_VK_KEYS.has(vk)) {
    lp |= (1 << 24);
  }
  if (isUp) {
    lp |= (1 << 30) | (1 << 31);
  }
  return lp;
}

// ── スキーマ ──

const windowFindSchema = z.object({
  titlePattern: z
    .string()
    .describe("ウィンドウタイトルの検索パターン（部分一致）"),
  processName: z
    .string()
    .optional()
    .describe("プロセス名でフィルタ（部分一致）"),
});

const windowListSchema = z.object({});

const windowInfoSchema = z.object({
  windowId: windowIdSchema,
});

const windowClickSchema = z.object({
  windowId: windowIdSchema,
  x: z
    .number()
    .describe("クリック位置のX座標（クライアント領域内、左上原点）"),
  y: z
    .number()
    .describe("クリック位置のY座標（クライアント領域内、左上原点）"),
  button: z
    .enum(["left", "right", "middle"])
    .optional()
    .default("left")
    .describe("マウスボタン"),
  doubleClick: z
    .boolean()
    .optional()
    .default(false)
    .describe("ダブルクリックする場合 true"),
});

const windowTypeSchema = z.object({
  windowId: windowIdSchema,
  text: z.string().describe("入力するテキスト"),
});

const windowKeySchema = z.object({
  windowId: windowIdSchema,
  key: z
    .string()
    .describe(
      "キー名（例: 'Enter', 'Escape', 'a', 'F1', 'Tab', 'Space', 'Up', 'Down', 'Left', 'Right'）",
    ),
  modifiers: z
    .array(z.enum(["ctrl", "alt", "shift"]))
    .optional()
    .describe("修飾キー"),
});

// ── ツール定義 ──

export const windowTools = [
  {
    name: "window_find",
    description:
      "ウィンドウをタイトルパターンやプロセス名で検索し、一致するウィンドウの HWND を返す",
    inputSchema: windowFindSchema,
    handler: async (args: unknown, _config: Config) => {
      const { titlePattern, processName: procFilter } =
        windowFindSchema.parse(args);

      const escaped = escapeRegExp(titlePattern);
      const matches = findWindowsByTitle(new RegExp(escaped, "i"));

      let results = matches.map((w) => ({
        hwnd: w.hwnd,
        title: w.title,
        processName: getProcessName(w.pid),
        className: w.className,
      }));

      if (procFilter) {
        const lowerFilter = procFilter.toLowerCase();
        results = results.filter((w) =>
          w.processName.toLowerCase().includes(lowerFilter),
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    },
  },

  {
    name: "window_list",
    description: "表示中の全ウィンドウ一覧を取得する",
    inputSchema: windowListSchema,
    handler: async (_args: unknown, _config: Config) => {
      const allHwnds = enumWindows();
      const results: Array<{
        hwnd: HwndValue;
        title: string;
        processName: string;
        className: string;
        rect: WindowRect;
      }> = [];

      for (const hwnd of allHwnds) {
        if (!win32.IsWindowVisible(toHwnd(hwnd))) continue;
        const title = getWindowTitle(toHwnd(hwnd));
        if (!title) continue;

        const pid = getWindowPid(toHwnd(hwnd));
        results.push({
          hwnd,
          title,
          processName: getProcessName(pid),
          className: getWindowClassName(toHwnd(hwnd)),
          rect: getWindowRect(hwnd),
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    },
  },

  {
    name: "window_info",
    description: "指定ウィンドウの詳細情報を取得する",
    inputSchema: windowInfoSchema,
    handler: async (args: unknown, _config: Config) => {
      const { windowId } = windowInfoSchema.parse(args);
      assertValidWindow(windowId);

      const title = getWindowTitle(toHwnd(windowId));
      const pid = getWindowPid(toHwnd(windowId));
      const rect = getWindowRect(windowId);
      const clientRect = getClientRectScreen(windowId);
      const visible = win32.IsWindowVisible(toHwnd(windowId));

      const info = {
        hwnd: windowId,
        title,
        processName: getProcessName(pid),
        className: getWindowClassName(toHwnd(windowId)),
        visible,
        rect,
        clientRect,
        size: {
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  },

  {
    name: "window_click",
    description: "ウィンドウ内の指定座標をクリックする",
    inputSchema: windowClickSchema,
    handler: async (args: unknown, _config: Config) => {
      const { windowId, x, y, button, doubleClick } =
        windowClickSchema.parse(args);
      assertValidWindow(windowId);
      validateCoordinates(windowId, x, y);

      const hwndPtr = toHwnd(windowId);
      const lParam = (y << 16) | (x & 0xffff);

      let downMsg: number;
      let upMsg: number;
      let dblMsg: number;
      let wParam: number;

      switch (button) {
        case "right":
          downMsg = WM_RBUTTONDOWN;
          upMsg = WM_RBUTTONUP;
          dblMsg = WM_RBUTTONDBLCLK;
          wParam = MK_RBUTTON;
          break;
        case "middle":
          downMsg = WM_MBUTTONDOWN;
          upMsg = WM_MBUTTONUP;
          dblMsg = WM_MBUTTONDBLCLK;
          wParam = MK_MBUTTON;
          break;
        default:
          downMsg = WM_LBUTTONDOWN;
          upMsg = WM_LBUTTONUP;
          dblMsg = WM_LBUTTONDBLCLK;
          wParam = MK_LBUTTON;
          break;
      }

      if (doubleClick) {
        win32.PostMessageW(hwndPtr, downMsg, wParam, lParam);
        await sleep(10);
        win32.PostMessageW(hwndPtr, upMsg, 0, lParam);
        await sleep(10);
        win32.PostMessageW(hwndPtr, dblMsg, wParam, lParam);
        await sleep(10);
        win32.PostMessageW(hwndPtr, upMsg, 0, lParam);
      } else {
        win32.PostMessageW(hwndPtr, downMsg, wParam, lParam);
        await sleep(10);
        win32.PostMessageW(hwndPtr, upMsg, 0, lParam);
      }

      const desc = doubleClick ? "ダブルクリック" : "クリック";
      return {
        content: [
          {
            type: "text" as const,
            text: `${button}ボタンで (${x}, ${y}) を${desc}しました (HWND: ${windowId})`,
          },
        ],
      };
    },
  },

  {
    name: "window_type",
    description: "ウィンドウにテキスト入力する",
    inputSchema: windowTypeSchema,
    handler: async (args: unknown, _config: Config) => {
      const { windowId, text } = windowTypeSchema.parse(args);
      assertValidWindow(windowId);

      const hwndPtr = toHwnd(windowId);
      for (const char of text) {
        win32.PostMessageW(hwndPtr, WM_CHAR, char.charCodeAt(0), 0);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `テキストを入力しました: "${text}" (${text.length}文字, HWND: ${windowId})`,
          },
        ],
      };
    },
  },

  {
    name: "window_key",
    description: "ウィンドウにキー入力（ショートカットキー含む）を送る",
    inputSchema: windowKeySchema,
    handler: async (args: unknown, _config: Config) => {
      const { windowId, key, modifiers } = windowKeySchema.parse(args);
      assertValidWindow(windowId);

      const hwndPtr = toHwnd(windowId);
      const vk = resolveVirtualKey(key);
      const scanCode = win32.MapVirtualKeyW(vk, MAPVK_VK_TO_VSC);

      const modVks: number[] = [];
      if (modifiers) {
        for (const mod of modifiers) {
          switch (mod) {
            case "ctrl":
              modVks.push(VK_CONTROL);
              break;
            case "alt":
              modVks.push(VK_MENU);
              break;
            case "shift":
              modVks.push(VK_SHIFT);
              break;
          }
        }
      }

      // 修飾キーを押下
      for (const modVk of modVks) {
        const modScan = win32.MapVirtualKeyW(modVk, MAPVK_VK_TO_VSC);
        win32.PostMessageW(
          hwndPtr,
          WM_KEYDOWN,
          modVk,
          makeLParam(modVk, modScan, false),
        );
      }

      // メインキーを押下・解放
      win32.PostMessageW(
        hwndPtr,
        WM_KEYDOWN,
        vk,
        makeLParam(vk, scanCode, false),
      );
      await sleep(10);
      win32.PostMessageW(hwndPtr, WM_KEYUP, vk, makeLParam(vk, scanCode, true));

      // 修飾キーを解放（逆順）
      for (const modVk of [...modVks].reverse()) {
        const modScan = win32.MapVirtualKeyW(modVk, MAPVK_VK_TO_VSC);
        win32.PostMessageW(
          hwndPtr,
          WM_KEYUP,
          modVk,
          makeLParam(modVk, modScan, true),
        );
      }

      const modDescs = modifiers?.map((m) => m.toUpperCase()) ?? [];
      const keyDesc = [...modDescs, key].join("+");

      return {
        content: [
          {
            type: "text" as const,
            text: `キーを送信しました: ${keyDesc} (HWND: ${windowId})`,
          },
        ],
      };
    },
  },
];
