/* ---- Tier-4 repo map (representative report mockup) --------------- */

type Tone = "ok" | "warn" | "bad";
type Sev = "high" | "medium" | "low" | "resolved";

const REPO_CARDS: { name: string; status: string; tone: Tone }[] = [
  { name: "auth/", status: "consistent", tone: "ok" },
  { name: "api spec", status: "2 gaps", tone: "bad" },
  { name: "rate-limits", status: "fixed", tone: "warn" },
  { name: "billing/", status: "3 inconsistent", tone: "bad" },
  { name: "cross-cutting", status: "mixed", tone: "warn" },
];

const REPO_FINDINGS: { sev: Sev; where: string; why: string }[] = [
  { sev: "high", where: "spec/auth.md ↔ config/roles.yaml", why: "all routes require auth vs guests may read orders" },
  { sev: "high", where: "billing/refunds.md ↔ policy/refunds.md", why: "refunds allowed any time vs blocked after 30 days" },
  { sev: "high", where: "api/orders.md ↔ db/schema.sql", why: "order total is optional vs NOT NULL on total" },
  { sev: "medium", where: "README.md ↔ docs/deploy.md", why: "single-region deploy vs multi-region failover" },
  { sev: "medium", where: "config/cache.yaml ↔ spec/freshness.md", why: "cache for 1h vs reads must always be fresh" },
  { sev: "low", where: "CHANGELOG.md ↔ package.json", why: "documents v2.1 vs version 2.0.3" },
  { sev: "resolved", where: "spec/webhooks.md", why: "retry-once vs retry-until-ack, reconciled in this pass" },
];

const SEV_LABEL: Record<Sev, string> = { high: "High", medium: "Medium", low: "Low", resolved: "Resolved" };

export function RepoReport() {
  return (
    <div className="repo">
      <div className="repo-cards">
        {REPO_CARDS.map((c) => (
          <div className={`rcard ${c.tone}`} key={c.name}>
            <span className="rcard-name">{c.name}</span>
            <span className="rcard-status">{c.status}</span>
          </div>
        ))}
      </div>
      <div className="repo-list-head">confirmed cross-file contradictions</div>
      <div className="repo-list">
        {REPO_FINDINGS.map((f, i) => (
          <div className="rrow" key={i}>
            <span className={`sev ${f.sev}`} />
            <span className="rwhere">{f.where}</span>
            <span className="rsep">·</span>
            <span className="rwhy">{f.why}</span>
          </div>
        ))}
      </div>
      <div className="repo-legend">
        {(["high", "medium", "low", "resolved"] as Sev[]).map((s) => (
          <span className="leg" key={s}>
            <span className={`sev ${s}`} /> {SEV_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
