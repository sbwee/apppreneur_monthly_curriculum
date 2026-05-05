import { featureBlocks, FeatureBlock } from "@/src/data/mockHome";

function FeatureContent({ block }: { block: FeatureBlock }) {
  if (block.variant === "quote") {
    return (
      <>
        <p className="text-lg uppercase tracking-[0.1em] text-[#355448]">{block.tag}</p>
        <p className="mt-6 font-serif text-4xl leading-snug text-[#284437]">{block.title}</p>
        <p className="mt-10 text-2xl text-[#284437]">— {block.quoteAuthor}</p>
      </>
    );
  }

  return (
    <>
      <p className="inline-block rounded-full bg-[#315B4D] px-4 py-1 text-base text-white">
        {block.tag}
      </p>
      <h3 className="mt-6 font-serif text-6xl leading-[1.05] text-[#1F2B24]">{block.title}</h3>
      <p className="mt-4 max-w-[560px] text-xl text-[#314137]">{block.description}</p>
      <button type="button" className="mt-8 rounded-full bg-[#315B4D] px-8 py-3 text-lg text-white">
        {block.cta}
      </button>
    </>
  );
}

export function FeatureCard() {
  return (
    <section className="feature-grid">
      {featureBlocks.map((block) => (
        <article
          key={block.title}
          className={block.variant === "quote" ? "feature-reflect" : "feature-deep-work"}
        >
          {block.variant === "quote" && (
            <button type="button" className="feature-plus" aria-label="Add reflection">
              +
            </button>
          )}
          <FeatureContent block={block} />
        </article>
      ))}
    </section>
  );
}
