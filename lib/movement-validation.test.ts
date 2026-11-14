import { describe, expect, it } from "vitest";
import { ApiError } from "./api-errors";
import { validateMovementInput } from "./movement-validation";

const validInput = {
  description: "  Conta de luz ",
  amountCents: 1,
  type: "expense",
  date: "2026-11-18",
  category: "Moradia",
};

describe("validateMovementInput", () => {
  it("normalizes valid fields and allows the smallest positive currency unit", () => {
    expect(validateMovementInput(validInput)).toEqual({
      description: "Conta de luz",
      amountCents: 1,
      type: "expense",
      date: "2026-11-18",
      category: "Moradia",
      notes: null,
    });
  });

  it("rejects amounts outside the supported positive money range", () => {
    expect(() =>
      validateMovementInput({ ...validInput, amountCents: 0 }),
    ).toThrow(ApiError);
    expect(() =>
      validateMovementInput({ ...validInput, amountCents: 1_000_000_000_000 }),
    ).toThrow(ApiError);
    expect(() =>
      validateMovementInput({ ...validInput, amountCents: "2500" }),
    ).toThrow(ApiError);
  });

  it("rejects impossible calendar dates and oversized notes", () => {
    expect(() =>
      validateMovementInput({ ...validInput, date: "2026-02-30" }),
    ).toThrow(ApiError);
    expect(() =>
      validateMovementInput({ ...validInput, notes: "x".repeat(501) }),
    ).toThrow(ApiError);
  });
});
