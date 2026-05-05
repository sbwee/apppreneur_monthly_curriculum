import { MasteryCard } from "@/src/components/workspace/MasteryCard";
import { ResourcesCard } from "@/src/components/workspace/ResourcesCard";
import { SectionsCard } from "@/src/components/workspace/SectionsCard";

export function UtilityPanel() {
  return (
    <aside className="workspace-utility">
      <SectionsCard />
      <ResourcesCard />
      <MasteryCard />
    </aside>
  );
}
