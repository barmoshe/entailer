import type { Badge } from "../data/scenarios.js";

export function VerdictBadge({ badge, label }: { badge: Badge; label: string }) {
  return (
    <span className={`badge ${badge}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
