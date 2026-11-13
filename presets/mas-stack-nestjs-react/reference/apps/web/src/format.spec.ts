import { describe, expect, it } from "vitest";
import { formatDate, formatNumber, formatRut } from "./format";

describe("es-CL", () => {
  it("formats a RUT", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });
  it("formats a date", () => {
    expect(formatDate(new Date("2026-11-13T00:00:00Z"))).toContain("13");
  });
  it("formats a number", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
  });
});
