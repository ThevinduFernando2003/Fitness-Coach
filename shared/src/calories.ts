/** kcal = MET × 3.5 × weight_kg / 200 × minutes_worked (rest excluded). */
export function estimateKcal(met: number, weightKg: number, workSeconds: number): number {
  const minutes = Math.max(workSeconds, 0) / 60;
  const kcal = met * 3.5 * Math.max(weightKg, 0) / 200 * minutes;
  return Math.round(kcal * 10) / 10;
}

export function sessionKcal(
  blocks: { met: number; workSeconds: number }[],
  weightKg: number,
): number {
  const total = blocks.reduce((sum, b) => sum + estimateKcal(b.met, weightKg, b.workSeconds), 0);
  return Math.round(total * 10) / 10;
}
