import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { SettingsPage } from "@/src/views/SettingsPage";

export default function SettingsRoute() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}
