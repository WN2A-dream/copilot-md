import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

export interface Config {
  timeout: number;
  maxOutputSize: number;
}

const DEFAULT_CONFIG: Config = {
  timeout: 30000,
  maxOutputSize: 100000,
};

export function loadConfig(): Config {
  const configPath = resolve(process.cwd(), "config.yaml");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = yaml.load(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_CONFIG };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      timeout: typeof obj.timeout === "number" ? obj.timeout : DEFAULT_CONFIG.timeout,
      maxOutputSize: typeof obj.maxOutputSize === "number" ? obj.maxOutputSize : DEFAULT_CONFIG.maxOutputSize,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
