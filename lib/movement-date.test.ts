import { describe, expect, it } from "vitest";
import { getDefaultMovementDate } from "./movement-date";

describe("getDefaultMovementDate", () => {
  it("uses today's date when the selected month is the current month", () => {
    expect(getDefaultMovementDate("2026-11", "2026-11-14")).toBe("2026-11-14");
  });

  it("defaults to the first day of another selected month", () => {
    expect(getDefaultMovementDate("2026-12", "2026-11-14")).toBe("2026-12-01");
  });
});
