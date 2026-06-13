import type { ReactNode } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { Leaf, Sprout, Trees } from "lucide-react";
import type { BotanicalGrowthStage } from "@/src/components/workspace/BotanicalGrowthIcon";

export const workspaceIconClass = "h-5 w-5 shrink-0 text-emerald-800";
export const workspaceIconSmClass = "h-4 w-4 shrink-0 text-emerald-800";
export const workspaceLinkIconClass = "h-3.5 w-3.5 shrink-0 text-emerald-800 opacity-75";

type WorkspaceIconProps = LucideProps & {
  icon: LucideIcon;
};

export function WorkspaceIcon({ icon: Icon, className, ...props }: WorkspaceIconProps) {
  return <Icon className={className ?? workspaceIconClass} aria-hidden="true" {...props} />;
}

type PanelHeadingProps = {
  icon: LucideIcon;
  children: ReactNode;
};

export function PanelHeading({ icon, children }: PanelHeadingProps) {
  return (
    <h2 className="utility-heading flex items-center gap-2">
      <WorkspaceIcon icon={icon} />
      <span>{children}</span>
    </h2>
  );
}

export function growthStageIcon(stage: BotanicalGrowthStage): LucideIcon {
  if (stage === "canopy") {
    return Trees;
  }
  if (stage === "growing") {
    return Leaf;
  }
  return Sprout;
}
