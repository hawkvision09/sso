"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  source: "catering" | "cost-mgmt" | "coupons";
  appName: string;
  action: string;
  title: string;
  details: string;
  timestamp: string;
  href: string;
}

const SOURCE_STYLES: Record<
  ActivityItem["source"],
  { pill: string; accent: string; icon: string }
> = {
  catering: {
    pill: "border border-amber-200 bg-amber-500/10 text-amber-700",
    accent: "from-amber-400 to-orange-500",
    icon: "🍽️",
  },
  "cost-mgmt": {
    pill: "border border-blue-200 bg-blue-500/10 text-blue-700",
    accent: "from-blue-400 to-cyan-500",
    icon: "📊",
  },
  coupons: {
    pill: "border border-fuchsia-200 bg-fuchsia-500/10 text-fuchsia-700",
    accent: "from-fuchsia-400 to-pink-500",
    icon: "🎟️",
  },
};

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function DashboardActivityStream() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard/activity", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load activity stream");
        }

        setActivities(data.activities || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load activity stream");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm">
      <div className="px-4 py-5 md:px-6 md:py-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-bg)] px-5 py-4 text-sm text-[var(--theme-danger-text)]">
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="mt-4 text-lg font-semibold text-[var(--theme-text)]">No activity yet</h3>
            <p className="mt-2 text-sm text-[var(--theme-muted)]">
              Once apps start writing activity events, they will appear here as interactive cards.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {activities.map((activity) => {
              const sourceStyle = SOURCE_STYLES[activity.source];

              return (
                <a
                  key={activity.id}
                  href={activity.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 transition-all hover:-translate-y-0.5 hover:bg-[var(--theme-surface-soft)] hover:shadow-md"
                >
                  <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${sourceStyle.accent}`} />

                  <div className="flex items-start justify-between gap-3 pl-2 lg:grid lg:grid-cols-8 lg:gap-4">
                    <h3 className="text-base font-semibold text-[var(--theme-text)] lg:col-span-7">
                      {activity.action}
                    </h3>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${sourceStyle.pill}`}>
                      <span>{sourceStyle.icon}</span>
                      <span>{activity.appName}</span>
                    </div>
                  </div>

                  <div className="pl-2 lg:grid lg:grid-cols-8 lg:gap-1">
                    <p className="col-span-2 mt-1 text-sm font-medium text-[var(--theme-text)] lg:mt-0">
                      {activity.title}
                    </p>
                    <p className="col-span-5 line-clamp-3 text-sm leading-relaxed text-[var(--theme-muted)]">
                      {activity.details}
                    </p>
                    <span className="text-center text-xs font-medium text-[var(--theme-muted)]">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
