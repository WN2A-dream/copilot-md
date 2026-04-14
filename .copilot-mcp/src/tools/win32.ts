import koffi from "koffi";

// ── 型定義 ──

export type HwndValue = number;

export interface WindowRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WindowInfo {
  hwnd: HwndValue;
  title: string;
  pid: number;
  className: string;
}

// ── DLL ロード ──

const user32 = koffi.load("user32.dll");
const gdi32 = koffi.load("gdi32.dll");
const dwmapi = koffi.load("dwmapi.dll");
const kernel32 = koffi.load("kernel32.dll");

// ── 構造体定義 ──

const RECT = koffi.struct("RECT", {
  left: "long",
  top: "long",
  right: "long",
  bottom: "long",
});

const POINT = koffi.struct("POINT", {
  x: "long",
  y: "long",
});

const BITMAPINFOHEADER = koffi.struct("BITMAPINFOHEADER", {
  biSize: "uint32",
  biWidth: "int32",
  biHeight: "int32",
  biPlanes: "uint16",
  biBitCount: "uint16",
  biCompression: "uint32",
  biSizeImage: "uint32",
  biXPelsPerMeter: "int32",
  biYPelsPerMeter: "int32",
  biClrUsed: "uint32",
  biClrImportant: "uint32",
});

// ── HWND 型定義 ──

const HWND = koffi.pointer("HWND", koffi.opaque());
const HDC = koffi.pointer("HDC", koffi.opaque());
const HBITMAP = koffi.pointer("HBITMAP", koffi.opaque());
const HGDIOBJ = koffi.pointer("HGDIOBJ", koffi.opaque());
const HANDLE = koffi.pointer("HANDLE", koffi.opaque());

// ── コールバック型定義 ──

const WNDENUMPROC = koffi.proto("WNDENUMPROC", "bool", [HWND, "int64"]);

// ── Win32 API 関数バインド ──

// ウィンドウ検索・情報
const FindWindowW = user32.func("FindWindowW", HWND, ["str16", "str16"]);
const EnumWindows = user32.func("EnumWindows", "bool", [koffi.pointer(WNDENUMPROC), "int64"]);
const GetWindowTextW = user32.func("GetWindowTextW", "int", [HWND, "void *", "int"]);
const GetWindowTextLengthW = user32.func("GetWindowTextLengthW", "int", [HWND]);
const IsWindow = user32.func("IsWindow", "bool", [HWND]);
const IsWindowVisible = user32.func("IsWindowVisible", "bool", [HWND]);
const GetWindowThreadProcessId = user32.func("GetWindowThreadProcessId", "uint32", [HWND, koffi.out("uint32 *")]);
const GetClassNameW = user32.func("GetClassNameW", "int", [HWND, "void *", "int"]);

// ウィンドウ矩形・位置
const GetWindowRect_ = user32.func("GetWindowRect", "bool", [HWND, "RECT *"]);
const GetClientRect_ = user32.func("GetClientRect", "bool", [HWND, "RECT *"]);
const ClientToScreen_ = user32.func("ClientToScreen", "bool", [HWND, "POINT *"]);
const DwmGetWindowAttribute = dwmapi.func("DwmGetWindowAttribute", "long", [HWND, "uint32", "RECT *", "uint32"]);

// ウィンドウ操作
const SetForegroundWindow = user32.func("SetForegroundWindow", "bool", [HWND]);
const ShowWindow = user32.func("ShowWindow", "bool", [HWND, "int"]);

// 入力操作
const PostMessageW = user32.func("PostMessageW", "bool", [HWND, "uint32", "uintptr", "intptr"]);
const SendMessageW = user32.func("SendMessageW", "intptr", [HWND, "uint32", "uintptr", "intptr"]);
const MapVirtualKeyW = user32.func("MapVirtualKeyW", "uint32", ["uint32", "uint32"]);
const VkKeyScanW = user32.func("VkKeyScanW", "short", ["char16"]);

// スクリーンショット (GDI)
const GetDC = user32.func("GetDC", HDC, [HWND]);
const GetWindowDC = user32.func("GetWindowDC", HDC, [HWND]);
const ReleaseDC = user32.func("ReleaseDC", "int", [HWND, HDC]);
const CreateCompatibleDC = gdi32.func("CreateCompatibleDC", HDC, [HDC]);
const DeleteDC = gdi32.func("DeleteDC", "bool", [HDC]);
const CreateCompatibleBitmap = gdi32.func("CreateCompatibleBitmap", HBITMAP, [HDC, "int", "int"]);
const SelectObject = gdi32.func("SelectObject", HGDIOBJ, [HDC, HGDIOBJ]);
const DeleteObject = gdi32.func("DeleteObject", "bool", [HGDIOBJ]);
const BitBlt = gdi32.func("BitBlt", "bool", [HDC, "int", "int", "int", "int", HDC, "int", "int", "uint32"]);
const PrintWindow = user32.func("PrintWindow", "bool", [HWND, HDC, "uint32"]);
const GetDIBits = gdi32.func("GetDIBits", "int", [HDC, HBITMAP, "uint32", "uint32", "void *", "BITMAPINFOHEADER *", "uint32"]);

// DPI
const SetProcessDPIAware = user32.func("SetProcessDPIAware", "bool", []);

// プロセス情報 (kernel32)
const OpenProcess = kernel32.func("OpenProcess", HANDLE, ["uint32", "bool", "uint32"]);
const CloseHandle = kernel32.func("CloseHandle", "bool", [HANDLE]);
const QueryFullProcessImageNameW = kernel32.func("QueryFullProcessImageNameW", "bool", [HANDLE, "uint32", "void *", koffi.inout("uint32 *")]);

// ── 定数 ──

const DWMWA_EXTENDED_FRAME_BOUNDS = 9;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

// ── HWND 変換ユーティリティ ──

export function toHwnd(value: HwndValue): HwndValue {
  // koffi 2.4+ accepts integers for opaque pointer parameters
  return value;
}

export function fromHwnd(hwnd: unknown): HwndValue {
  if (typeof hwnd === "number") return hwnd;
  if (typeof hwnd === "bigint") return Number(hwnd);
  // koffi External (opaque pointer) → numeric address
  return Number(koffi.address(hwnd));
}

// ── DPI Awareness 初期化 ──

let dpiInitialized = false;

export function initDpiAwareness(): void {
  if (dpiInitialized) return;
  SetProcessDPIAware();
  dpiInitialized = true;
}

// モジュールロード時に DPI Awareness を初期化
initDpiAwareness();

// ── ヘルパー関数 ──

export function getWindowRect(hwnd: HwndValue): WindowRect {
  const hwndPtr = toHwnd(hwnd);
  const rect = { left: 0, top: 0, right: 0, bottom: 0 };

  // DwmGetWindowAttribute を優先（正確な矩形取得）
  const hr = DwmGetWindowAttribute(hwndPtr, DWMWA_EXTENDED_FRAME_BOUNDS, rect, koffi.sizeof(RECT));
  if (hr === 0) {
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  }

  // フォールバック: GetWindowRect
  GetWindowRect_(hwndPtr, rect);
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

export function getClientRectScreen(hwnd: HwndValue): WindowRect {
  const hwndPtr = toHwnd(hwnd);
  const rect = { left: 0, top: 0, right: 0, bottom: 0 };
  GetClientRect_(hwndPtr, rect);

  const topLeft = { x: 0, y: 0 };
  ClientToScreen_(hwndPtr, topLeft);

  return {
    left: topLeft.x,
    top: topLeft.y,
    right: topLeft.x + rect.right,
    bottom: topLeft.y + rect.bottom,
  };
}

export function validateCoordinates(hwnd: HwndValue, x: number, y: number): void {
  const clientRect = getClientRectScreen(hwnd);
  const width = clientRect.right - clientRect.left;
  const height = clientRect.bottom - clientRect.top;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    throw new Error(
      `座標 (${x}, ${y}) はクライアント領域外です。有効範囲: 0 <= x < ${width}, 0 <= y < ${height}`,
    );
  }
}

export function getProcessName(pid: number): string {
  const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
  if (!hProcess) return "";

  try {
    const buf = Buffer.alloc(1024 * 2);
    const size = [1024];
    const ok = QueryFullProcessImageNameW(hProcess, 0, buf, size);
    if (!ok) return "";

    const name = buf.slice(0, (size[0] as number) * 2).toString("utf16le").replace(/\0.*$/, "");
    // フルパスからファイル名部分のみ抽出
    const lastSep = Math.max(name.lastIndexOf("\\"), name.lastIndexOf("/"));
    return lastSep >= 0 ? name.substring(lastSep + 1) : name;
  } finally {
    CloseHandle(hProcess);
  }
}

// ── ウィンドウ列挙 ──

export function enumWindows(): HwndValue[] {
  const hwnds: HwndValue[] = [];

  const callback = koffi.register((hwnd: unknown, _lParam: unknown) => {
    hwnds.push(fromHwnd(hwnd));
    return true;
  }, WNDENUMPROC);

  try {
    EnumWindows(callback, 0);
  } finally {
    koffi.unregister(callback);
  }

  return hwnds;
}

export function getWindowTitle(hwndPtr: unknown): string {
  const len = GetWindowTextLengthW(hwndPtr);
  if (len <= 0) return "";
  const buf = Buffer.alloc((len + 1) * 2);
  GetWindowTextW(hwndPtr, buf, len + 1);
  return buf.toString("utf16le").replace(/\0.*$/, "");
}

export function getWindowClassName(hwndPtr: unknown): string {
  const buf = Buffer.alloc(256 * 2);
  const len = GetClassNameW(hwndPtr, buf, 256);
  if (len <= 0) return "";
  return buf.toString("utf16le").replace(/\0.*$/, "");
}

export function getWindowPid(hwndPtr: unknown): number {
  const pidBuf = [0];
  GetWindowThreadProcessId(hwndPtr, pidBuf);
  return pidBuf[0] as number;
}

export function findWindowsByTitle(pattern: string | RegExp): WindowInfo[] {
  const hwnds = enumWindows();
  const results: WindowInfo[] = [];
  const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;

  for (const hwndVal of hwnds) {
    const hwndPtr = toHwnd(hwndVal);

    if (!IsWindowVisible(hwndPtr)) continue;

    const title = getWindowTitle(hwndPtr);
    if (!title) continue;

    if (!regex.test(title)) continue;

    results.push({
      hwnd: hwndVal,
      title,
      pid: getWindowPid(hwndPtr),
      className: getWindowClassName(hwndPtr),
    });
  }

  return results;
}

// ── API エクスポート（ツール層から直接利用可能） ──

export const win32 = {
  // ウィンドウ検索・情報
  FindWindowW,
  EnumWindows,
  GetWindowTextW,
  GetWindowTextLengthW,
  IsWindow,
  IsWindowVisible,
  GetWindowThreadProcessId,
  GetClassNameW,

  // ウィンドウ矩形・位置
  GetWindowRect: GetWindowRect_,
  GetClientRect: GetClientRect_,
  ClientToScreen: ClientToScreen_,
  DwmGetWindowAttribute,

  // ウィンドウ操作
  SetForegroundWindow,
  ShowWindow,

  // 入力操作
  PostMessageW,
  SendMessageW,
  MapVirtualKeyW,
  VkKeyScanW,

  // スクリーンショット (GDI)
  GetDC,
  GetWindowDC,
  ReleaseDC,
  CreateCompatibleDC,
  DeleteDC,
  CreateCompatibleBitmap,
  SelectObject,
  DeleteObject,
  BitBlt,
  PrintWindow,
  GetDIBits,

  // DPI
  SetProcessDPIAware,

  // プロセス情報
  OpenProcess,
  CloseHandle,
  QueryFullProcessImageNameW,

  // 構造体
  RECT,
  POINT,
  BITMAPINFOHEADER,

  // 型
  HWND,
  HDC,
  HBITMAP,
  HGDIOBJ,
  HANDLE,

  // 定数
  DWMWA_EXTENDED_FRAME_BOUNDS,
  PROCESS_QUERY_LIMITED_INFORMATION,
} as const;
