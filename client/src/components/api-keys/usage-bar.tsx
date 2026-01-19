import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ApiKey } from "@/hooks/use-api-keys";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

interface UsageBarProps {
  apiKey: ApiKey;
  showUpgradeLink?: boolean;
}

export function UsageBar({ apiKey, showUpgradeLink = true }: UsageBarProps) {
  const usagePercent = Math.min(
    (apiKey.monthlyUsage / apiKey.monthlyLimit) * 100,
    100
  );

  // Color coding based on usage percentage
  const getColorClass = () => {
    if (usagePercent >= 90) return "bg-red-500";
    if (usagePercent >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getTextColorClass = () => {
    if (usagePercent >= 90) return "text-red-600";
    if (usagePercent >= 70) return "text-amber-600";
    return "text-emerald-600";
  };

  // Calculate reset date (first day of next month)
  const getResetDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monthly Usage</span>
          <span className={`font-medium ${getTextColorClass()}`}>
            {apiKey.monthlyUsage.toLocaleString()} / {apiKey.monthlyLimit.toLocaleString()} requests
          </span>
        </div>

        <div className="relative">
          <Progress value={usagePercent} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all ${getColorClass()}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Resets on {getResetDate()}</span>
          {showUpgradeLink && usagePercent >= 70 && (
            <Link href="/settings" className="flex items-center gap-1 text-primary hover:underline">
              Upgrade plan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for table rows
export function UsageBarCompact({ apiKey }: { apiKey: ApiKey }) {
  const usagePercent = Math.min(
    (apiKey.monthlyUsage / apiKey.monthlyLimit) * 100,
    100
  );

  const getColorClass = () => {
    if (usagePercent >= 90) return "bg-red-500";
    if (usagePercent >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColorClass()}`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {apiKey.monthlyUsage}/{apiKey.monthlyLimit}
      </span>
    </div>
  );
}
