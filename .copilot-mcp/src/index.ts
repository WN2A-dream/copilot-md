import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { loadConfig } from "./config.js";
import type { Config } from "./config.js";
import { gitTools } from "./tools/git.js";
import { mavenTools } from "./tools/maven.js";
import { gradleTools } from "./tools/gradle.js";
import { dotnetTools } from "./tools/dotnet.js";
import { fileTools } from "./tools/file.js";
import { javaTools } from "./tools/java.js";
import { md2htmlTools } from "./tools/md2html.js";
import { workspaceTools } from "./tools/workspace.js";
import { structuredFileTools } from "./tools/structured-file.js";
import type { z } from "zod";

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (args: unknown, config: Config) => Promise<{
    content: { type: "text"; text: string }[];
    isError?: boolean;
  }>;
}

const allTools: ToolDefinition[] = [
  ...gitTools,
  ...mavenTools,
  ...gradleTools,
  ...dotnetTools,
  ...javaTools,
  ...fileTools,
  ...md2htmlTools,
  ...workspaceTools,
  ...structuredFileTools,
];

const toolMap = new Map<string, ToolDefinition>();
for (const tool of allTools) {
  toolMap.set(tool.name, tool);
}

const config = loadConfig();

const server = new Server(
  {
    name: "local-command-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = toolMap.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `不明なツール: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `ツール実行エラー: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCPサーバーの起動に失敗しました:", err);
  process.exit(1);
});
