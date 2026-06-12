/** A single points-balance change as returned by /api/points/history. */
export interface PointsHistoryRecord {
  previousPoints: number;
  newPoints: number;
  createdAt: string;
}

/** One plotted point: a balance at a moment in time (ISO date). */
export interface BalancePoint {
  date: string;
  points: number;
}

/**
 * Turn the history feed (newest-first balance changes) into a chronological
 * balance-over-time series for charting. Anchors the line with the balance
 * *before* the earliest recorded change, so a single change still draws a
 * two-point trend. Returns [] for empty history.
 */
export function buildBalanceSeries(history: PointsHistoryRecord[]): BalancePoint[] {
  if (history.length === 0) return [];
  const asc = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const series: BalancePoint[] = [{ date: asc[0].createdAt, points: asc[0].previousPoints }];
  for (const h of asc) series.push({ date: h.createdAt, points: h.newPoints });
  return series;
}
