import { workspaceMastery } from "@/src/data/mockWorkspace";

export function MasteryCard() {
  return (
    <section className="mastery-card">
      <div className="mastery-ring-small">
        <div className="mastery-ring-small-inner">
          <p className="text-4xl font-semibold text-[#8B5A2B]">{workspaceMastery.value}%</p>
          <p className="text-xs uppercase tracking-[0.13em] text-[#8B5A2B]">Mastery</p>
        </div>
      </div>
      <p className="mt-5 text-center text-base text-[#3D4038]">{workspaceMastery.message}</p>
    </section>
  );
}
