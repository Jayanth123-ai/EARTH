import { describe, expect, it } from "vitest";
import { calculateTerritoryPower } from "./territory-power";

describe("calculateTerritoryPower", () => {
  const now = new Date("2026-10-05T00:00:00.000Z");

  it("combines rarity, age, achievement and bounded activity scores", () => {
    expect(calculateTerritoryPower([
      { rarity: "RARE", acquiredAt: new Date("2026-10-04T00:00:00.000Z") },
    ], 2, 10, now)).toBe(362);
  });

  it("clamps negative inputs and ignores age before acquisition", () => {
    expect(calculateTerritoryPower([
      { rarity: "COMMON", acquiredAt: new Date("2026-10-06T00:00:00.000Z") },
    ], -2, -10, now)).toBe(100);
  });
});
