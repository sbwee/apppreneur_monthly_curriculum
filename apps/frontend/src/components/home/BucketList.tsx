import { bucketItems } from "@/src/data/mockHome";

const iconByType = {
  Video: "▶",
  Book: "☷",
  Article: "▤",
} as const;

export function BucketList() {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-5xl text-[#1F2B24]">Learning Bucket List</h2>
        <button type="button" className="text-base text-[var(--color-ink-muted)] hover:underline">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {bucketItems.map((item) => (
          <article key={item.id} className="bucket-item-card">
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

            <p className="text-sm text-[var(--color-ink-muted)]">{item.meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
