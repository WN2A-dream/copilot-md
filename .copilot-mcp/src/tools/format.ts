export function formatResult(result: { exitCode: number | null; stdout: string; stderr: string }): { content: { type: "text"; text: string }[]; isError?: boolean } {
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout);
  if (result.stderr) parts.push(`[stderr]\n${result.stderr}`);
  if (parts.length === 0) parts.push("(出力なし)");

  return {
    content: [{ type: "text" as const, text: parts.join("\n") }],
    isError: result.exitCode !== 0 ? true : undefined,
  };
}
