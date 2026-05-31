import { HomePage } from "@/src/views/HomePage";
import { AuthGuard } from "@/src/components/auth/AuthGuard";

export default function HomeRoute() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
