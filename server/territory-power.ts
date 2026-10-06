export type TerritoryPowerInput = {
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
  acquiredAt: Date;
};

const rarityBase: Record<TerritoryPowerInput["rarity"], number> = {
  COMMON: 100,
  RARE: 250,
  EPIC: 600,
  LEGENDARY: 1400,
  MYTHIC: 3000,
};

/** Deterministic, server-owned score. Never accept its result from the client. */
export function calculateTerritoryPower(
  holdings: TerritoryPowerInput[],
  achievementCount: number,
  activityPoints = 0,
  now = new Date(),
): number {
  const safeAchievements = Math.max(0, Math.floor(achievementCount));
  const safeActivity = Math.min(500, Math.max(0, Math.floor(activityPoints)));
  const holdingsPower = holdings.reduce((total, holding) => {
    const ageDays = Math.max(0, (now.getTime() - holding.acquiredAt.getTime()) / 86_400_000);
    const ageBonus = Math.min(365, Math.floor(ageDays)) * 2;
    return total + rarityBase[holding.rarity] + ageBonus;
  }, 0);
  return holdingsPower + safeAchievements * 50 + safeActivity;
}
