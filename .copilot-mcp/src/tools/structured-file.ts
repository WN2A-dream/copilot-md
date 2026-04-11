import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import { z } from "zod";
import type { Config } from "../config.js";
import * as yaml from "js-yaml";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import * as TOML from "smol-toml";
import * as ini from "ini";

// ファイルサイズ上限（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 共通スキーマ
const workingDirectorySchema = z.string().describe("ワーキングディレクトリの絶対パス");

const readSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ファイルの相対パス"),
});

const writeSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ファイルの相対パス"),
  data: z.string().describe("書き込むデータ（JSON文字列として渡す）"),
  indent: z.number().optional().describe("インデント幅（デフォルト: 2）"),
});

const xmlWriteSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ファイルの相対パス"),
  data: z.string().describe("書き込むデータ（JSON文字列として渡す）"),
  rootName: z.string().optional().describe("ルート要素名（デフォルト: root）"),
});

const jsonPathReadSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ファイルの相対パス"),
  jsonPath: z.string().describe("JSONPath（例: $.store.book[0].title、ドット記法もサポート: store.book.0.title）"),
});

const jsonPathWriteSchema = z.object({
  workingDirectory: workingDirectorySchema,
  path: z.string().describe("対象ファイルの相対パス"),
  jsonPath: z.string().describe("JSONPath（例: $.store.book[0].title、ドット記法もサポート: store.book.0.title）"),
  value: z.string().describe("設定する値（JSON文字列として渡す）"),
  indent: z.number().optional().describe("インデント幅（デフォルト: 2）"),
});

/**
 * ワーキングディレクトリ内のパスに解決し、スコープ外アクセスを防止
 */
function resolveScopedPath(workingDirectory: string, relativePath: string): string {
  const normalizedCwd = normalize(resolve(workingDirectory));
  const targetPath = normalize(resolve(workingDirectory, relativePath));

  if (targetPath !== normalizedCwd && !targetPath.startsWith(normalizedCwd + sep)) {
    throw new Error("ワーキングディレクトリ外へのアクセスは禁止されています");
  }

  return targetPath;
}

/**
 * ファイルサイズをチェック
 */
async function checkFileSize(filePath: string): Promise<void> {
  const stats = await stat(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`ファイルサイズが上限（${MAX_FILE_SIZE / 1024 / 1024}MB）を超えています`);
  }
}

/**
 * UTF-8 BOMを除去してファイルを読み込む
 */
async function readFileWithBom(filePath: string): Promise<string> {
  await checkFileSize(filePath);
  let content = await readFile(filePath, "utf-8");
  // UTF-8 BOM を除去
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
}

// 禁止キー（プロトタイプ汚染防止）
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * 簡易JSONPath評価（get）
 * $.store.book[0].title または store.book.0.title 形式をサポート
 */
function getByJsonPath(obj: unknown, jsonPath: string): unknown {
  // $. プレフィックスを除去
  let path = jsonPath.startsWith("$.") ? jsonPath.slice(2) : jsonPath;
  if (path.startsWith("$")) {
    path = path.slice(1);
  }

  // 配列アクセス記法を変換: [0] -> .0
  path = path.replace(/\[(\d+)\]/g, ".$1");

  const keys = path.split(".").filter((k) => k !== "");
  let current: unknown = obj;

  for (const key of keys) {
    // プロトタイプ汚染チェック
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`禁止されたキー '${key}' へのアクセスは許可されていません`);
    }
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * 簡易JSONPath評価（set）
 */
function setByJsonPath(obj: unknown, jsonPath: string, value: unknown): void {
  // $. プレフィックスを除去
  let path = jsonPath.startsWith("$.") ? jsonPath.slice(2) : jsonPath;
  if (path.startsWith("$")) {
    path = path.slice(1);
  }

  // 配列アクセス記法を変換
  path = path.replace(/\[(\d+)\]/g, ".$1");

  const keys = path.split(".").filter((k) => k !== "");
  if (keys.length === 0) {
    throw new Error("無効なJSONPathです");
  }

  // プロトタイプ汚染チェック（全キー）
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`禁止されたキー '${key}' へのアクセスは許可されていません`);
    }
  }

  let current: unknown = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current === null || current === undefined || typeof current !== "object") {
      throw new Error(`パス '${keys.slice(0, i + 1).join(".")}' が存在しません`);
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (current === null || current === undefined || typeof current !== "object") {
    throw new Error("パスの親オブジェクトが存在しません");
  }

  (current as Record<string, unknown>)[keys[keys.length - 1]] = value;
}

// JSON読み込みツール
const jsonReadTool = {
  name: "json_read",
  description: "JSONファイルを読み込んでパースし、内容を返す",
  inputSchema: readSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath } = readSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = JSON.parse(content);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// JSON書き込みツール
const jsonWriteTool = {
  name: "json_write",
  description: "オブジェクトをJSON形式でファイルに書き込む",
  inputSchema: writeSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath, data, indent = 2 } = writeSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const parsedData = JSON.parse(data);
      const jsonContent = JSON.stringify(parsedData, null, indent);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, jsonContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `JSON書き込み完了: ${filePath}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// YAML読み込みツール
const yamlReadTool = {
  name: "yaml_read",
  description: "YAMLファイルを読み込んでパースし、内容をJSONとして返す",
  inputSchema: readSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath } = readSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = yaml.load(content);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// YAML書き込みツール
const yamlWriteTool = {
  name: "yaml_write",
  description: "オブジェクトをYAML形式でファイルに書き込む",
  inputSchema: writeSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath, data, indent = 2 } = writeSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const parsedData = JSON.parse(data);
      const yamlContent = yaml.dump(parsedData, { indent });

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, yamlContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `YAML書き込み完了: ${filePath}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// XML読み込みツール
const xmlReadTool = {
  name: "xml_read",
  description: "XMLファイルを読み込んでパースし、内容をJSONとして返す",
  inputSchema: readSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath } = readSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const data = parser.parse(content);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// XML書き込みツール
const xmlWriteTool = {
  name: "xml_write",
  description: "オブジェクトをXML形式でファイルに書き込む",
  inputSchema: xmlWriteSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath, data, rootName = "root" } = xmlWriteSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const parsedData = JSON.parse(data);

      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        format: true,
        indentBy: "  ",
      });

      // データ構造に応じてラップ方法を決定
      let dataToWrite: unknown;
      if (
        parsedData !== null &&
        typeof parsedData === "object" &&
        !Array.isArray(parsedData) &&
        Object.keys(parsedData).length === 1
      ) {
        // 単一ルートキーを持つオブジェクト: そのまま使用
        dataToWrite = parsedData;
      } else {
        // 複数キー、配列、またはプリミティブ: rootNameでラップ
        dataToWrite = { [rootName]: parsedData };
      }

      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(dataToWrite);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, xmlContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `XML書き込み完了: ${filePath}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// TOML読み込みツール
const tomlReadTool = {
  name: "toml_read",
  description: "TOMLファイルを読み込んでパースし、内容をJSONとして返す",
  inputSchema: readSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath } = readSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = TOML.parse(content);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// TOML書き込みツール
const tomlWriteTool = {
  name: "toml_write",
  description: "オブジェクトをTOML形式でファイルに書き込む",
  inputSchema: writeSchema.omit({ indent: true }),
  handler: async (args: unknown, _config: Config) => {
    const parsed = writeSchema.omit({ indent: true }).parse(args);
    const { workingDirectory, path: filePath, data } = parsed;

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const parsedData = JSON.parse(data);
      const tomlContent = TOML.stringify(parsedData);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, tomlContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `TOML書き込み完了: ${filePath}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// INI読み込みツール
const iniReadTool = {
  name: "ini_read",
  description: "INIファイルを読み込んでパースし、内容をJSONとして返す",
  inputSchema: readSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath } = readSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = ini.parse(content);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// INI書き込みツール
const iniWriteTool = {
  name: "ini_write",
  description: "オブジェクトをINI形式でファイルに書き込む",
  inputSchema: writeSchema.omit({ indent: true }),
  handler: async (args: unknown, _config: Config) => {
    const parsed = writeSchema.omit({ indent: true }).parse(args);
    const { workingDirectory, path: filePath, data } = parsed;

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const parsedData = JSON.parse(data);
      const iniContent = ini.stringify(parsedData);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, iniContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `INI書き込み完了: ${filePath}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// JSONPath取得ツール
const jsonGetTool = {
  name: "json_get",
  description: "JSONファイルからJSONPathで指定した値を取得する",
  inputSchema: jsonPathReadSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath, jsonPath } = jsonPathReadSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = JSON.parse(content);
      const value = getByJsonPath(data, jsonPath);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

// JSONPath設定ツール
const jsonSetTool = {
  name: "json_set",
  description: "JSONファイルのJSONPathで指定した場所に値を設定して保存する",
  inputSchema: jsonPathWriteSchema,
  handler: async (args: unknown, _config: Config) => {
    const { workingDirectory, path: filePath, jsonPath, value, indent = 2 } = jsonPathWriteSchema.parse(args);

    try {
      const targetPath = resolveScopedPath(workingDirectory, filePath);
      const content = await readFileWithBom(targetPath);
      const data = JSON.parse(content);
      const parsedValue = JSON.parse(value);

      setByJsonPath(data, jsonPath, parsedValue);

      const jsonContent = JSON.stringify(data, null, indent);
      await writeFile(targetPath, jsonContent, "utf-8");

      return {
        content: [{ type: "text" as const, text: `JSON更新完了: ${filePath} (${jsonPath})` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `エラー: ${message}` }],
        isError: true,
      };
    }
  },
};

export const structuredFileTools = [
  jsonReadTool,
  jsonWriteTool,
  yamlReadTool,
  yamlWriteTool,
  xmlReadTool,
  xmlWriteTool,
  tomlReadTool,
  tomlWriteTool,
  iniReadTool,
  iniWriteTool,
  jsonGetTool,
  jsonSetTool,
];
