import Link from "next/link";
import type { BucketItem } from "@/src/data/mockHome";
import type { InboxEmptyReason } from "@/src/lib/homeApi";

const iconByType = {
  Video: "▶",
  Book: "☷",
  Article: "▤",
} as const;

const STATUS_LABELS: Record<NonNullable<BucketItem["status"]>, string> = {
  done: "Done",
  pending: "Today",
  deferred: "Deferred",
  skipped: "Skipped",
};

type BucketListProps = {
  items: BucketItem[];
  emptyReason?: InboxEmptyReason;
};

function emptyCopy(reason: InboxEmptyReason): { message: string; cta?: { href: string; label: string } } {
  switch (reason) {
    case "no_curriculum":
      return {
        message: "Your inbox is waiting for its first path. Create a curriculum in Workspace to begin.",
        cta: { href: "/workspace", label: "Open Workspace" },
      };
    case "no_active_curriculum":
      return {
        message: "Activate a curriculum in Workspace to see what to learn today.",
        cta: { href: "/workspace", label: "Activate a path" },
      };
    case "no_schedule":
      return {
        message: "Generate your curriculum structure in Workspace to seed today's learning plan.",
        cta: { href: "/workspace", label: "Generate structure" },
      };
    case "nothing_today":
      return {
        message: "You're clear for today — enjoy the breathing room, or get ahead in Workspace.",
        cta: { href: "/workspace", label: "View schedule" },
      };
    default:
      return {
        message: "Sign in and set up a curriculum to see today's learning inbox.",
      };
  }
}

export function BucketList({ items, emptyReason = "none" }: BucketListProps) {
  const isEmpty = items.length === 0;
  const empty = isEmpty ? emptyCopy(emptyReason) : null;
  const pendingCount = items.filter((item) => item.status === "pending" || item.status == null).length;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-5xl text-[#1F2B24]">Today&apos;s Inbox</h2>
          {!isEmpty && pendingCount > 0 && (
            <p className="mt-1 text-base text-[var(--color-ink-muted)]">
              {pendingCount} item{pendingCount === 1 ? "" : "s"} left for today
            </p>
          )}
        </div>
        {!isEmpty && (
          <Link href="/workspace" className="text-base text-[var(--color-ink-muted)] hover:underline">
            Open workspace
          </Link>
        )}
      </div>

      {isEmpty && empty ? (
        <div className="bucket-inbox-empty">
          <p className="text-lg text-[var(--color-ink-muted)]">{empty.message}</p>
          {empty.cta && (
            <Link href={empty.cta.href} className="bucket-inbox-cta">
              {empty.cta.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const status = item.status ?? "pending";
            const isDone = status === "done";

            return (
              <article
                key={item.id}
                className={`bucket-item-card ${isDone ? "bucket-item-card-done" : ""}`}
              >
                <div
                  className="bucket-item-icon"
                  aria-hidden="true"
                  style={{ backgroundColor: item.accent }}
                >
                  {iconByType[item.type]}
                </div>

                <div>
                  <p className="text-lg text-[var(--color-ink-muted)]">{item.type}</p>
                  <h3 className="mt-1 text-2xl text-[#253028]">{item.title}</h3>
                  <p className="mt-1 text-lg text-[var(--color-ink-muted)]">{item.description}</p>
                </div>

                <div className="bucket-item-meta">
                  <span className={`bucket-status-badge bucket-status-${status}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <p className="text-sm text-[var(--color-ink-muted)]">{item.meta}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
