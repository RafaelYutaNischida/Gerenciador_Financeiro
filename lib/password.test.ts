import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores a salted hash and verifies only the matching password", async () => {
    const storedHash = await hashPassword("minha-senha-segura");

    expect(storedHash).not.toContain("minha-senha-segura");
    expect(await verifyPassword("minha-senha-segura", storedHash)).toBe(true);
    expect(await verifyPassword("outra-senha", storedHash)).toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("senha", "invalid")).toBe(false);
  });
});
