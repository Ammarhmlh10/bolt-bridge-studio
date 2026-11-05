import { describe, expect, it } from "vitest";

import {
  BATCH_SIZE_RANGE,
  RETRIES_RANGE,
  chunk,
  extractPlaceholders,
  isIntegerInRange,
  isPrivateHost,
  normalizeEndpoint,
  normalizeSender,
  parseSubscribers,
  replacePlaceholders,
} from "@/lib/hodhod-rules";

describe("message placeholders", () => {
  it("lists each placeholder once in order", () => {
    expect(extractPlaceholders("مرحباً {{name}} فاتورتك {{ amount }} يا {{name}}")).toEqual(["name", "amount"]);
  });

  it("fills known values and blanks unknown ones", () => {
    expect(replacePlaceholders("مرحباً {{name}} {{amount}}", { name: "سارة" })).toBe("مرحباً سارة ");
  });
});

describe("connection rules", () => {
  it("only accepts https addresses", () => {
    expect(normalizeEndpoint("http://api.example.com")).toBeNull();
    expect(normalizeEndpoint(" https://api.example.com/send ")).toBe("https://api.example.com/send");
  });

  it("limits sender name to 11 characters", () => {
    expect(normalizeSender("ABCDEFGHIJK")).toBe("ABCDEFGHIJK");
    expect(normalizeSender("ABCDEFGHIJKL")).toBeNull();
    expect(normalizeSender("   ")).toBeNull();
  });

  it("blocks private network addresses", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("192.168.1.4")).toBe(true);
    expect(isPrivateHost("api.hodhod.com")).toBe(false);
  });
});

describe("sending preferences", () => {
  it("batch size must be between 10 and 100", () => {
    expect(isIntegerInRange(9, BATCH_SIZE_RANGE)).toBe(false);
    expect(isIntegerInRange(10, BATCH_SIZE_RANGE)).toBe(true);
    expect(isIntegerInRange(100, BATCH_SIZE_RANGE)).toBe(true);
    expect(isIntegerInRange(101, BATCH_SIZE_RANGE)).toBe(false);
  });

  it("retries must be between 0 and 5", () => {
    expect(isIntegerInRange(0, RETRIES_RANGE)).toBe(true);
    expect(isIntegerInRange(5, RETRIES_RANGE)).toBe(true);
    expect(isIntegerInRange(6, RETRIES_RANGE)).toBe(false);
  });

  it("splits recipients into batches of the chosen size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("subscriber parsing", () => {
  it("reads the data, subscribers or bare array shapes", () => {
    expect(parseSubscribers([{ email: "a@x.com", name: "A" }])).toEqual([{ email: "a@x.com", name: "A" }]);
    expect(parseSubscribers({ data: [{ address: "0555", full_name: "B" }] })).toEqual([{ email: "0555", name: "B" }]);
    expect(parseSubscribers({ subscribers: [{ name: "no contact" }] })).toEqual([]);
  });
});
