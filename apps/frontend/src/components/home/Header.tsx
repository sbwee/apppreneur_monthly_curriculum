import Link from "next/link";
import { Heart, UserRound } from "lucide-react";
import { workspaceIconClass } from "@/src/components/ui/workspaceIcons";

export function Header() {
  return (
    <header className="home-header">
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Heart className={workspaceIconClass} aria-hidden="true" />
        </button>
        <Link href="/settings" className="icon-btn icon-btn-profile" aria-label="Profile settings">
          <UserRound className={workspaceIconClass} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
