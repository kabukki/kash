// Distribution des salaires nets mensuels (EQTP, secteur privé, France) — 2024.
// Source : Insee Première n°2079, "Les salaires dans le secteur privé en 2024".
// https://www.insee.fr/fr/statistiques/8657156
export const NET_MONTHLY_DECILES: ReadonlyArray<{
  percentile: number
  netMonthly: number
}> = [
  { percentile: 10, netMonthly: 1492 },
  { percentile: 20, netMonthly: 1669 },
  { percentile: 30, netMonthly: 1823 },
  { percentile: 40, netMonthly: 1992 },
  { percentile: 50, netMonthly: 2190 },
  { percentile: 60, netMonthly: 2442 },
  { percentile: 70, netMonthly: 2785 },
  { percentile: 80, netMonthly: 3305 },
  { percentile: 90, netMonthly: 4334 },
  { percentile: 95, netMonthly: 5593 },
  { percentile: 99, netMonthly: 10261 },
]

// Linear interpolation between known deciles to estimate the percentile rank
// of a given net monthly salary. Below D1 or above P99, we clamp instead of
// extrapolating — the tails aren't linear and we don't have data past them.
export function percentileRank(netMonthly: number): number {
  const points = NET_MONTHLY_DECILES
  if (netMonthly <= points[0].netMonthly) return points[0].percentile
  const last = points[points.length - 1]
  if (netMonthly >= last.netMonthly) return last.percentile

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (netMonthly >= a.netMonthly && netMonthly <= b.netMonthly) {
      const t = (netMonthly - a.netMonthly) / (b.netMonthly - a.netMonthly)
      return a.percentile + t * (b.percentile - a.percentile)
    }
  }
  return last.percentile
}
