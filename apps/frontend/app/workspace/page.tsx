import { WorkspacePage } from "@/src/views/WorkspacePage";
import { AuthGuard } from "@/src/components/auth/AuthGuard";

export default function WorkspaceRoute() {
  return (
    <AuthGuard>
      <WorkspacePage />
    </AuthGuard>
  );
}
