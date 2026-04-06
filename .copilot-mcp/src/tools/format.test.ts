import { describe, it, expect } from "vitest";
import { formatResult } from "./format.js";

describe("formatResult", () => {
  it("stdoutのみの場合", () => {
    const result = formatResult({
      exitCode: 0,
      stdout: "output text",
      stderr: "",
    });
    expect(result.content[0].text).toBe("output text");
    expect(result.isError).toBeUndefined();
  });

  it("stderrのみの場合", () => {
    const result = formatResult({
      exitCode: 1,
      stdout: "",
      stderr: "error text",
    });
    expect(result.content[0].text).toBe("[stderr]\nerror text");
    expect(result.isError).toBe(true);
  });

  it("stdout + stderrの場合", () => {
    const result = formatResult({
      exitCode: 0,
      stdout: "out",
      stderr: "err",
    });
    expect(result.content[0].text).toBe("out\n[stderr]\nerr");
    expect(result.isError).toBeUndefined();
  });

  it("出力なしの場合", () => {
    const result = formatResult({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    expect(result.content[0].text).toBe("(出力なし)");
  });

  it("非ゼロ終了コードでisError=trueになる", () => {
    const result = formatResult({
      exitCode: 127,
      stdout: "something",
      stderr: "",
    });
    expect(result.isError).toBe(true);
  });

  it("exitCode=0ではisErrorがundefined", () => {
    const result = formatResult({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    expect(result.isError).toBeUndefined();
  });
});
