export function computeSectionEarned({ possiblePoints, sampleCount, passedCount, notApplicable }: { possiblePoints: number; sampleCount: number; passedCount: number; notApplicable?: boolean; }) {
  if (notApplicable && sampleCount > 0 && passedCount === sampleCount) return +possiblePoints.toFixed(6);
  const denom = Math.max(sampleCount, 1);
  const ratio = Math.min(Math.max(passedCount / denom, 0), 1);
  return +(possiblePoints * ratio).toFixed(6);
}

export function gradeBand(overallPct: number) {
  if (overallPct >= 90) return "Exceptional Quality";
  if (overallPct >= 80) return "Standard Quality";
  if (overallPct >= 70) return "Marginal Quality (Action Plan Required)";
  return "Unsatisfactory Quality (Action Plan Required) (Priority Facility)";
}

export function aggregateSurvey(sections: Array<{ possiblePoints: number; earnedPoints: number }>) {
  const totalPossible = sections.reduce((s, r) => s + (r.possiblePoints ?? 0), 0);
  const totalEarned = sections.reduce((s, r) => s + (r.earnedPoints ?? 0), 0);
  const pct = totalPossible > 0 ? +(100 * (totalEarned / totalPossible)).toFixed(4) : 0;
  return { totalPossible: +totalPossible.toFixed(6), totalEarned: +totalEarned.toFixed(6), overallPercent: pct, band: gradeBand(pct) };
}
