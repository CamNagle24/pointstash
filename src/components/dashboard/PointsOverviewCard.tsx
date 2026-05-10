"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { usePoints } from "@/hooks/usePoints";
import { formatPoints } from "@/lib/utils";

export function PointsOverviewCard() {
  const { totals, isLoading } = usePoints();
  const grand = totals.reduce((sum, t) => sum + t.points, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total points</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{isLoading ? "—" : formatPoints(grand)}</p>
        <p className="mt-1 text-sm text-muted-foreground">across {totals.length} chains</p>
      </CardContent>
    </Card>
  );
}
